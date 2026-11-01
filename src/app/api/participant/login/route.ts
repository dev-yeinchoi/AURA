import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { openParticipantSession } from "@/lib/participant-session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const invalid = () => NextResponse.json(
  { error: "참가자 번호 또는 PIN을 확인해 주세요. 진행자에게 문의할 수 있습니다." },
  { status: 401, headers: { "Cache-Control": "no-store" } },
);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }
  if (!body || typeof body !== "object") return invalid();
  const { code, pin } = body as Record<string, unknown>;
  if (typeof code !== "string" || typeof pin !== "string") return invalid();
  const normalizedCode = code.trim().toUpperCase();
  if (!/^(PT|MT)-\d{3,}$/.test(normalizedCode) || !/^\d{8}$/.test(pin)) {
    return invalid();
  }

  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return NextResponse.json(
    { error: "서버 설정을 확인할 수 없습니다." },
    { status: 503 },
  );
  const pinDigest = createHmac("sha256", secret)
    .update("aura-pin-v1\0")
    .update(pin)
    .digest("hex");

  try {
    const db = createSupabaseAdmin();
    const { data: participantId, error: redeemError } = await db.rpc(
      "redeem_participant_pin",
      { p_code: normalizedCode, p_pin_digest: pinDigest },
    );
    if (redeemError) throw redeemError;
    if (!participantId) return invalid();
    await openParticipantSession(participantId);
    return NextResponse.json(
      { participantCode: normalizedCode },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Participant login failed", error);
    return NextResponse.json(
      { error: "현재 참가자 확인을 완료하지 못했습니다. 진행자에게 문의해 주세요." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
