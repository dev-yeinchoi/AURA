import { NextResponse } from "next/server";
import { getParticipantSession } from "@/lib/participant-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const participant = await getParticipantSession();
    if (!participant) return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    return NextResponse.json(
      {
        authenticated: true,
        participantCode: participant.participant_code,
        phase: participant.phase,
        status: participant.status,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Participant session lookup failed", error);
    return NextResponse.json(
      { error: "참가자 정보를 확인하지 못했습니다." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
