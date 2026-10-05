import "server-only";

/**
 * 서버 전용 환경변수 접근점.
 *
 * `NEXT_PUBLIC_` 접두사 변수는 두지 않는다(계획 D2).
 * Supabase 는 secret key(`sb_secret_…`)로 서버에서만 호출한다.
 */

const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "RESEARCHER_PASSCODE",
  "SESSION_SECRET",
] as const;

export type EnvKey = (typeof KEYS)[number];

/** 설정 여부만 반환한다. 값은 절대 반환하지 않는다(상태 확인 화면용). */
export function envPresence(): Record<EnvKey, boolean> {
  const out = {} as Record<EnvKey, boolean>;
  for (const key of KEYS) {
    out[key] = (process.env[key] ?? "").length > 0;
  }
  return out;
}

/** 필수 환경변수를 읽는다. 없으면 즉시 예외로 실패한다. */
export function requireEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`환경변수 ${key} 가 설정되지 않았습니다. .env.example 참고.`);
  }
  return value;
}
