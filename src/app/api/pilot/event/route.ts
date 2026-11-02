import { NextResponse } from "next/server";
import { checks, demographics, ppd, riskQuestions, trust, usability } from "@/content/surveys";
import { stages, type Stage } from "@/lib/preview-state";
import { getParticipantSession } from "@/lib/participant-session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type EventBody = {
  stage: Stage;
  round: number | null;
  previousStage?: Stage;
  previousRound?: number | null;
  answers?: Record<string, number | string>;
  decisions?: Record<string, number>;
};

function instrumentFor(stage: Stage, key: string) {
  if (stage === "demographics" && demographics.some(q => q.id === key)) return "demographics";
  if (stage === "ppd" && ppd.some(q => q.id === key)) return "ppd";
  if (stage === "risk" && riskQuestions.some(q => q.id === key)) return "risk_check";
  if (stage === "trust" && trust.some(q => q.id === key)) return "trust";
  if (stage === "post") {
    if (checks.some(q => q.id === key)) return "manipulation_check";
    if (usability.some(q => q.id === key)) return "umux";
    if (key === "accuracy") return "accuracy";
    if (key === "comments") return "free_text";
  }
  return null;
}

function validAnswer(stage: Stage, key: string, value: unknown) {
  const questions = stage === "demographics" ? demographics : stage === "ppd" ? ppd :
    stage === "risk" ? riskQuestions : stage === "trust" ? trust :
    stage === "post" ? [...checks, ...usability] : [];
  const question = questions.find(q => q.id === key);
  if (question) return typeof value === "number" && Number.isInteger(value) &&
    value >= 1 && value <= question.options.length;
  if (stage === "post" && key === "accuracy") return typeof value === "number" &&
    Number.isInteger(value) && value >= 0 && value <= 100 && value % 5 === 0;
  if (stage === "post" && key === "comments") return typeof value === "string" &&
    value.trim().length > 0 && value.length <= 5000;
  return false;
}

export async function POST(request: Request) {
  try {
    const session = await getParticipantSession();
    if (!session || session.phase !== "pilot") return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const body = await request.json() as EventBody;
    const pilotStages: Stage[] = ["demographics", "ppd", "scenario", "risk", "browse", "initial", "loading", "advice", "final", "trust", "post", "done"];
    if (!pilotStages.includes(body.stage) || (body.round !== null && body.round !== 1 && body.round !== 2) ||
        (["demographics", "ppd", "post", "done"].includes(body.stage) !== (body.round === null))) {
      return NextResponse.json({ error: "화면 정보가 올바르지 않습니다." }, { status: 400 });
    }
    const db = createSupabaseAdmin();
    const { data: participant, error: participantError } = await db.from("participants")
      .select("online_consent_confirmed_at, status, started_at")
      .eq("id", session.id).single();
    if (participantError) throw participantError;
    if (!participant.online_consent_confirmed_at || ["declined", "stopped", "completed"].includes(participant.status)) {
      return NextResponse.json({ error: "온라인 동의가 필요합니다." }, { status: 403 });
    }
    const now = new Date();

    if (!participant.started_at) {
      const { error } = await db.from("participants").update({
        started_at: now.toISOString(), status: "in_progress",
      }).eq("id", session.id);
      if (error) throw error;
    }

    if (body.previousStage && body.answers) {
      const required = body.previousStage === "demographics" ? demographics :
        body.previousStage === "ppd" ? ppd : body.previousStage === "risk" ? riskQuestions :
        body.previousStage === "trust" ? trust : body.previousStage === "post" ? [...checks, ...usability] : [];
      if (required.some(question => !validAnswer(body.previousStage!, question.id, body.answers![question.id])) ||
          (body.previousStage === "post" &&
            (!validAnswer("post", "accuracy", body.answers.accuracy) ||
             !validAnswer("post", "comments", body.answers.comments)))) {
        return NextResponse.json({ error: "모든 문항에 응답해 주세요." }, { status: 400 });
      }
      const entries = Object.entries(body.answers);
      for (const [key, value] of entries) {
        const instrument = instrumentFor(body.previousStage, key);
        if (!instrument) continue;
        if (!validAnswer(body.previousStage, key, value)) {
          return NextResponse.json({ error: "문항 응답 값이 올바르지 않습니다." }, { status: 400 });
        }
        const roundNo = instrument === "risk_check" || instrument === "trust"
          ? body.previousRound : null;
        if ((instrument === "risk_check" || instrument === "trust") && roundNo !== 1 && roundNo !== 2) continue;
        let query = db.from("survey_answers")
          .select("id").eq("participant_id", session.id)
          .eq("instrument", instrument).eq("question_key", key);
        query = roundNo == null ? query.is("round_no", null) : query.eq("round_no", roundNo);
        const { data: existing, error: readError } = await query.maybeSingle();
        if (readError) throw readError;
        const payload = {
          participant_id: session.id, round_no: roundNo ?? null,
          instrument, question_key: key,
          figma_node_id: key.includes(":") ? key : null,
          answer_number: typeof value === "number" ? value : null,
          answer_text: typeof value === "string" ? value : null,
          submitted_at: now.toISOString(), updated_at: now.toISOString(),
        };
        const result = existing
          ? await db.from("survey_answers").update(payload).eq("id", existing.id)
          : await db.from("survey_answers").insert(payload);
        if (result.error) throw result.error;
      }
    }

    if (body.previousStage && ["initial", "final"].includes(body.previousStage) &&
        (body.previousRound === 1 || body.previousRound === 2) && body.decisions) {
      const { data: round, error: roundError } = await db.from("rounds")
        .select("form_code").eq("participant_id", session.id)
        .eq("round_no", body.previousRound).single();
      if (roundError) throw roundError;
      const rows = Object.entries(body.decisions)
        .filter(([id, choice]) => new RegExp(`^${round.form_code}(0[1-9]|1[0-2])$`).test(id) && (choice === 0 || choice === 1))
        .map(([employee_id, choice]) => ({
          participant_id: session.id, round_no: body.previousRound!,
          employee_id, stage: body.previousStage!, choice,
          selected_at: now.toISOString(), submitted_at: now.toISOString(),
        }));
      if (rows.length !== 12) return NextResponse.json({ error: "12명의 판단이 필요합니다." }, { status: 400 });
      const { error } = await db.from("decisions").upsert(rows,
        { onConflict: "participant_id,round_no,employee_id,stage" });
      if (error) throw error;
    }

    const { data: openVisit, error: visitError } = await db.from("page_visits")
      .select("id, page_key, round_no, entered_at")
      .eq("participant_id", session.id).is("left_at", null)
      .order("entered_at", { ascending: false }).limit(1).maybeSingle();
    if (visitError) throw visitError;
    if (openVisit && openVisit.page_key === body.stage && openVisit.round_no === body.round) {
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (openVisit) {
      const wallMs = Math.max(0, now.getTime() - Date.parse(openVisit.entered_at));
      const { error } = await db.from("page_visits").update({
        left_at: now.toISOString(), last_seen_at: now.toISOString(),
        wall_ms: wallMs, exit_reason: "next",
      }).eq("id", openVisit.id);
      if (error) throw error;
    }
    if (body.previousStage === "trust" && (body.previousRound === 1 || body.previousRound === 2)) {
      const { error } = await db.from("rounds").update({ completed_at: now.toISOString() })
        .eq("participant_id", session.id).eq("round_no", body.previousRound);
      if (error) throw error;
    }
    if (body.stage === "scenario" && (body.round === 1 || body.round === 2)) {
      const { data: round, error: readRoundError } = await db.from("rounds")
        .select("started_at").eq("participant_id", session.id)
        .eq("round_no", body.round).single();
      if (readRoundError) throw readRoundError;
      if (!round.started_at) {
        const { error } = await db.from("rounds").update({ started_at: now.toISOString() })
          .eq("participant_id", session.id).eq("round_no", body.round);
        if (error) throw error;
      }
    }
    if (body.stage === "done") {
      const { error } = await db.from("participants").update({
        completed_at: now.toISOString(), status: "completed",
      }).eq("id", session.id);
      if (error) throw error;
    } else {
      const { error } = await db.from("page_visits").insert({
        participant_id: session.id, round_no: body.round,
        page_key: body.stage,
      });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Pilot event storage failed", error);
    return NextResponse.json({ error: "응답을 저장하지 못했습니다. 진행자에게 문의해 주세요." }, { status: 503 });
  }
}
