import { redirect } from "next/navigation";
import Preview from "@/components/preview";
import OnlineConsent from "@/components/online-consent";
import { getParticipantSession } from "@/lib/participant-session";
import { getPilotAssignment } from "@/lib/pilot-assignment";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStudyDocuments } from "@/lib/study-documents";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const session = await getParticipantSession();
  if (!session) redirect("/");
  if (session.phase !== "pilot") {
    return <main className="workspace panel document"><h1>파일럿 참여 화면</h1><p>현재 파일럿 참가자 번호만 사용할 수 있습니다.</p></main>;
  }
  const { data: participant, error } = await createSupabaseAdmin()
    .from("participants")
    .select("online_consent_confirmed_at, status")
    .eq("id", session.id).single();
  if (error) throw error;
  if (participant.status === "declined" || participant.status === "stopped") {
    return <main className="workspace panel document"><h1>참여가 종료되었습니다.</h1></main>;
  }
  if (participant.status === "completed") {
    return <main className="workspace panel document"><h1>참여가 완료되었습니다.</h1><p>감사합니다. 진행자에게 완료 사실을 알려주세요.</p></main>;
  }
  if (!participant.online_consent_confirmed_at) {
    const document = await getActiveStudyDocuments();
    if (!document) return <main className="workspace panel document"><h1>동의 문서 준비 중</h1><p>승인된 설명문과 동의서가 등록된 뒤 참여할 수 있습니다. 진행자에게 알려주세요.</p></main>;
    return <OnlineConsent documentVersion={document.version} />;
  }
  const assignment = await getPilotAssignment(session.id);
  return <Preview pilot={{ participantCode: session.participant_code, assignment }} />;
}
