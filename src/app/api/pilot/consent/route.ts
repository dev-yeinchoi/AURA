import { NextResponse } from "next/server";
import { getParticipantSession } from "@/lib/participant-session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getParticipantSession();
  if (!session || session.phase !== "pilot") {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
    }
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { body = {}; }
  const { decision, documentVersion, informationMs, consentMs } = body;
  if ((decision !== "accepted" && decision !== "declined") ||
      typeof documentVersion !== "string" || !/^sha256-[0-9a-f]{16}$/.test(documentVersion) ||
      typeof informationMs !== "number" || !Number.isInteger(informationMs) ||
      typeof consentMs !== "number" || !Number.isInteger(consentMs) ||
      informationMs < 0 || informationMs > 14_400_000 ||
      consentMs < 0 || consentMs > 14_400_000) {
    return NextResponse.json({ error: "동의 정보가 올바르지 않습니다." }, { status: 400 });
  }
  const { error } = await createSupabaseAdmin().rpc("record_online_consent", {
    p_participant_id: session.id,
    p_decision: decision,
    p_document_version: documentVersion,
    p_information_ms: informationMs,
    p_consent_ms: consentMs,
  });
  if (error) {
    if (error.message.includes("documents changed")) {
      return NextResponse.json({ error: "설명문 또는 동의서가 바뀌었습니다. 새로고침한 뒤 다시 확인해 주세요." }, { status: 409 });
    }
    if (error.message.includes("unavailable for this participant")) {
      return NextResponse.json({ error: "이 참가자 번호로 동의를 기록할 수 없습니다." }, { status: 409 });
    }
    console.error("Online consent storage failed", error);
    return NextResponse.json({ error: "동의를 저장하지 못했습니다. 진행자에게 알려주세요." }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
