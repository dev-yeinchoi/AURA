import { NextResponse } from "next/server";
import { closeParticipantSession } from "@/lib/participant-session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await closeParticipantSession();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Participant logout failed", error);
    return NextResponse.json(
      { error: "로그아웃을 완료하지 못했습니다." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
