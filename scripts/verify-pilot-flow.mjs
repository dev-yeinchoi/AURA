import { createHmac, randomInt } from "node:crypto";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const source = require("../src/content/figma-source.json");
const app = process.env.AURA_TEST_BASE_URL ?? "http://localhost:3001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase 환경 변수가 필요합니다.");
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const code = `PT-9${randomInt(100000, 999999)}`;
const pin = String(randomInt(0, 100_000_000)).padStart(8, "0");
const pinDigest = createHmac("sha256", secret).update("aura-pin-v1\0").update(pin).digest("hex");
const questions = frame => source.frames.find(f => f.id === frame).texts
  .filter(t => /^\d+\./.test(t.text)).map(t => t.id);
const makeAnswers = ids => Object.fromEntries(ids.map(id => [id, 3]));
const ppd = makeAnswers(questions("383:68"));
const risk = makeAnswers(questions("387:219"));
const trust = makeAnswers(questions("398:693"));
const post = { ...makeAnswers(["438:1215", "438:1226", "438:1237", "438:1180", "438:1195"]),
  accuracy: 55, comments: "파일럿 화면과 진행 시간 점검 의견" };
let participantId;
let browser;

async function event(page, stage, round, previousStage, previousRound, answers, decisions) {
  const response = await page.evaluate(async payload => {
    const result = await fetch("/api/pilot/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: result.ok, status: result.status, body: await result.text() };
  }, { stage, round, previousStage, previousRound, answers, decisions });
  if (!response.ok) throw new Error(`Pilot event ${previousStage ?? "start"} -> ${stage}: ${response.status} ${response.body}`);
}

async function decisionsFor(roundNo, stage) {
  const { data, error } = await db.from("rounds").select("form_code")
    .eq("participant_id", participantId).eq("round_no", roundNo).single();
  if (error) throw error;
  return Object.fromEntries(Array.from({ length: 12 }, (_, i) =>
    [`${data.form_code}${String(i + 1).padStart(2, "0")}`, (i + (stage === "final" ? 1 : 0)) % 2]));
}

try {
  const issued = await db.rpc("issue_participant", {
    p_code: code, p_phase: "pilot", p_pin_digest: pinDigest,
    p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (issued.error || !issued.data) throw issued.error ?? new Error("Test participant issue failed");
  participantId = issued.data;
  const consent = await db.from("participants")
    .update({ paper_consent_confirmed_at: new Date().toISOString() })
    .eq("id", participantId);
  if (consent.error) throw consent.error;

  const testHostIp = process.env.AURA_TEST_HOST_IP;
  browser = await chromium.launch({
    headless: true,
    args: testHostIp ? [`--host-resolver-rules=MAP ${new URL(app).hostname} ${testHostIp}`] : [],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(app);
  await page.locator("#participant-id").fill(code);
  await page.locator("#participant-pin").fill(pin);
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page.getByText(`확인된 참가자 번호: ${code}`).waitFor();
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.getByRole("button", { name: "파일럿 시작" }).click();
  await page.getByRole("heading", { name: "기본 정보 입력" }).waitFor();
  for (const question of await page.locator("fieldset.question").all()) {
    await question.locator("input[type=radio]").first().check();
  }
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("heading", { name: "사전 설문" }).waitFor();

  await event(page, "scenario", 1, "ppd", null, ppd);
  for (let round = 1; round <= 2; round++) {
    await event(page, "risk", round, "scenario", round);
    await event(page, "browse", round, "risk", round, risk);
    await event(page, "initial", round, "browse", round);
    await event(page, "loading", round, "initial", round, undefined, await decisionsFor(round, "initial"));
    await event(page, "advice", round, "loading", round);
    await event(page, "final", round, "advice", round);
    await event(page, "trust", round, "final", round, undefined, await decisionsFor(round, "final"));
    await event(page, round === 1 ? "scenario" : "post", round === 1 ? 2 : null,
      "trust", round, trust);
  }
  await event(page, "done", null, "post", null, post);

  const counts = {};
  for (const table of ["assignments", "rounds", "page_visits", "survey_answers", "decisions"]) {
    const result = await db.from(table).select("*", { count: "exact", head: true })
      .eq("participant_id", participantId);
    if (result.error) throw result.error;
    counts[table] = result.count;
  }
  if (counts.assignments !== 1 || counts.rounds !== 2 || counts.page_visits !== 19 ||
      counts.survey_answers !== 39 || counts.decisions !== 48) {
    throw new Error(`Wrong pilot row counts: ${JSON.stringify(counts)}`);
  }
  const { data: visits, error: visitsError } = await db.from("page_visits")
    .select("left_at, wall_ms").eq("participant_id", participantId);
  if (visitsError) throw visitsError;
  if (visits.some(v => v.left_at === null || v.wall_ms === null)) throw new Error("Unclosed page visit");
  const { data: participant, error: completionError } = await db.from("participants")
    .select("status, started_at, completed_at").eq("id", participantId).single();
  if (completionError) throw completionError;
  if (participant.status !== "completed" || !participant.started_at || !participant.completed_at) {
    throw new Error("Participant completion time missing");
  }
  const { data: comment, error: commentError } = await db.from("survey_answers")
    .select("answer_text").eq("participant_id", participantId)
    .eq("instrument", "free_text").single();
  if (commentError || !comment.answer_text) throw commentError ?? new Error("Free response missing");
  console.log("Pilot flow passed: browser login, surveys, 48 decisions, 19 page times, free response, completion.");
} finally {
  if (browser) await browser.close();
  if (participantId) {
    for (const table of ["survey_answers", "decisions", "page_visits", "rounds", "assignments",
      "participant_sessions", "participant_credentials", "participants"]) {
      const column = table === "participants" ? "id" : "participant_id";
      const { error } = await db.from(table).delete().eq(column, participantId);
      if (error) throw new Error(`Cleanup failed in ${table}: ${error.message}`);
    }
  }
}
