import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "./supabase-admin";

const COOKIE = "aura_session";
const SESSION_HOURS = 8;

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function openParticipantSession(participantId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60_000);
  const { error } = await createSupabaseAdmin()
    .from("participant_sessions")
    .insert({
      token_digest: digest(token),
      participant_id: participantId,
      expires_at: expiresAt.toISOString(),
    });
  if (error) throw new Error(`세션 저장 실패: ${error.message}`);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function getParticipantSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = createSupabaseAdmin();
  const { data: session, error: sessionError } = await db
    .from("participant_sessions")
    .select("participant_id, expires_at, revoked_at")
    .eq("token_digest", digest(token))
    .maybeSingle();
  if (sessionError) throw new Error(`세션 조회 실패: ${sessionError.message}`);
  if (!session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) {
    return null;
  }
  const { data: participant, error: participantError } = await db
    .from("participants")
    .select("id, participant_code, phase, status")
    .eq("id", session.participant_id)
    .maybeSingle();
  if (participantError) throw new Error(`참가자 조회 실패: ${participantError.message}`);
  return participant;
}

export async function closeParticipantSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const { error } = await createSupabaseAdmin()
      .from("participant_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_digest", digest(token));
    if (error) throw new Error(`세션 종료 실패: ${error.message}`);
  }
  store.delete(COOKIE);
}
