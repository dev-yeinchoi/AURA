import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase URL과 서버 전용 키가 필요합니다.");
const db = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const [mode, first, second] = process.argv.slice(2);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (mode === "--link") {
  if (!/^(PT|MT)-\d{3,}$/.test(first ?? "") || !uuid.test(second ?? "")) throw new Error("사용법: --link PT-001 <모집 신청 UUID>");
  const { data, error } = await db.rpc("link_participant_identity", { p_code: first, p_application_id: second });
  if (error || !data) throw new Error(`기존 참가자 연결 실패: ${error?.message ?? "신청 정보 또는 참가자 번호 확인 필요"}`);
  process.stdout.write(`연결 완료: ${first}\n`);
} else {
  if (!["pilot", "main"].includes(mode) || !uuid.test(first ?? "")) throw new Error("사용법: pilot|main <모집 신청 UUID>");
  const prefix = mode === "pilot" ? "PT" : "MT";
  const { data: existing, error: listError } = await db.from("participants").select("participant_code").eq("phase", mode);
  if (listError) throw listError;
  const highest = Math.max(0, ...existing.filter(row => !/^PT-9\d{6}$/.test(row.participant_code)).map(row => Number(row.participant_code.split("-")[1])).filter(Number.isFinite));
  const code = `${prefix}-${String(highest + 1).padStart(3, "0")}`;
  const { error } = await db.rpc("issue_participant_identity", { p_code: code, p_phase: mode, p_application_id: first });
  if (error) throw new Error(`참가자 발급 실패: ${error.message}`);
  process.stdout.write(`참가자 코드: ${code}\n모집 신청 정보의 전화번호 뒤 4자리로 본인 확인합니다.\n`);
}
