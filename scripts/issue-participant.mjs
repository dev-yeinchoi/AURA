import { createHmac, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  throw new Error(".env.local에 Supabase URL과 서버 전용 키가 필요합니다.");
}

const db = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const [mode, reissueCode] = process.argv.slice(2);
if (!["pilot", "main", "--reissue"].includes(mode)) {
  throw new Error(
    "사용법: npm run participant:issue -- pilot|main 또는 --reissue PT-001",
  );
}
if (mode === "--reissue" && !/^(PT|MT)-\d{3,}$/.test(reissueCode ?? "")) {
  throw new Error("재발급할 참가자 코드가 필요합니다. 예: --reissue PT-001");
}

const pin = String(randomInt(0, 100_000_000)).padStart(8, "0");
const digest = createHmac("sha256", secret)
  .update("aura-pin-v1\0")
  .update(pin)
  .digest("hex");
const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

let code;
if (mode === "--reissue") {
  code = reissueCode;
  const { data, error } = await db.rpc("reissue_participant_pin", {
    p_code: code,
    p_pin_digest: digest,
    p_expires_at: expiresAt,
  });
  if (error) throw new Error(`PIN 재발급 실패: ${error.message}`);
  if (!data) throw new Error("해당 코드가 없거나 재발급할 수 없는 상태입니다.");
} else {
  const prefix = mode === "pilot" ? "PT" : "MT";
  const { data: existing, error: listError } = await db
    .from("participants")
    .select("participant_code")
    .eq("phase", mode);
  if (listError) throw new Error(`기존 코드 조회 실패: ${listError.message}`);
  const highest = Math.max(
    0,
    ...existing
      .filter((row) => !/^PT-9\d{6}$/.test(row.participant_code))
      .map((row) => Number(row.participant_code.split("-")[1])),
  );
  code = `${prefix}-${String(highest + 1).padStart(3, "0")}`;
  const { error } = await db.rpc("issue_participant", {
    p_code: code,
    p_phase: mode,
    p_pin_digest: digest,
    p_expires_at: expiresAt,
  });
  if (error) throw new Error(`참가자 발급 실패: ${error.message}`);
}

const localExpiry = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(expiresAt));
process.stdout.write(`참가자 코드: ${code}\n일회용 PIN: ${pin}\n만료: ${localExpiry}\n`);
process.stdout.write("PIN은 이 화면에 한 번만 표시됩니다. 참가자에게 직접 전달하세요.\n");
