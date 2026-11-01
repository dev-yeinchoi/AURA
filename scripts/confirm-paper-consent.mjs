import { createClient } from "@supabase/supabase-js";

const code = process.argv[2];
if (!/^PT-\d{3,}$/.test(code ?? "")) {
  throw new Error("사용법: npm run participant:confirm -- PT-001");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error("Supabase 환경 변수가 필요합니다.");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.from("participants")
  .update({ paper_consent_confirmed_at: new Date().toISOString() })
  .eq("participant_code", code).eq("phase", "pilot")
  .is("paper_consent_confirmed_at", null)
  .select("participant_code, paper_consent_confirmed_at").maybeSingle();
if (error) throw error;
if (!data) throw new Error("해당 파일럿 코드가 없거나 이미 동의 확인이 기록되었습니다.");
console.log(`${data.participant_code}의 대면 서면 동의 확인 시각을 기록했습니다.`);
