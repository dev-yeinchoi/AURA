import { createClient } from "@supabase/supabase-js";
import { scoreNcs6 } from "../src/lib/ncs.ts";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error("Supabase 환경 변수가 필요합니다.");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const { data: participants, error } = await db.from("participants")
  .select("id, participant_code, status, consent_document_version, started_at, completed_at")
  .eq("phase", "pilot").order("participant_code");
if (error) throw error;
if (!participants.length) {
  console.log("파일럿 참가자 기록이 없습니다.");
  process.exit(0);
}
for (const participant of participants) {
  const total = participant.started_at && participant.completed_at
    ? Math.round((Date.parse(participant.completed_at) - Date.parse(participant.started_at)) / 1000)
    : null;
  const testLabel = participant.consent_document_version === "SYNTHETIC_TEST_NO_HUMAN_PARTICIPANT" ||
    /^PT-9\d{6}$/.test(participant.participant_code)
    ? "[합성 테스트] " : "";
  console.log(`\n${testLabel}${participant.participant_code} | ${participant.status} | 전체 ${total === null ? "진행 중" : `${total}초`}`);
  const { data: visits, error: visitError } = await db.from("page_visits")
    .select("round_no, page_key, wall_ms, entered_at")
    .eq("participant_id", participant.id).order("entered_at");
  if (visitError) throw visitError;
  for (const visit of visits) {
    console.log(`  ${visit.round_no ?? "공통"} / ${visit.page_key}: ${visit.wall_ms === null ? "진행 중" : `${(visit.wall_ms / 1000).toFixed(1)}초`}`);
  }
  const { data: ncsAnswers, error: ncsError } = await db.from("survey_answers")
    .select("question_key, answer_number").eq("participant_id", participant.id)
    .eq("instrument", "ncs_6").order("question_key");
  if (ncsError) throw ncsError;
  if (ncsAnswers.length === 6 && ncsAnswers.every(row => row.answer_number !== null)) {
    const score = scoreNcs6(ncsAnswers.map(row => row.answer_number));
    console.log(`  사전 설문(2): 합계 ${score.total}/30, 평균 ${score.mean.toFixed(2)}/5 (3·4번 역채점)`);
  }
  const { data: comment, error: commentError } = await db.from("survey_answers")
    .select("answer_text").eq("participant_id", participant.id)
    .eq("instrument", "free_text").maybeSingle();
  if (commentError) throw commentError;
  console.log(`  자유 응답: ${comment?.answer_text ?? "아직 없음"}`);
}
