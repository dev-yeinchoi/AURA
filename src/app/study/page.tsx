import { redirect } from "next/navigation";
import Preview from "@/components/preview";
import { getParticipantSession } from "@/lib/participant-session";
import { getPilotAssignment } from "@/lib/pilot-assignment";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const session = await getParticipantSession();
  if (!session) redirect("/");
  if (session.phase !== "pilot") {
    return <main className="workspace panel document"><h1>파일럿 참여 화면</h1><p>현재 파일럿 참가자 번호만 사용할 수 있습니다.</p></main>;
  }
  const { data: participant, error } = await createSupabaseAdmin()
    .from("participants")
    .select("paper_consent_confirmed_at, status")
    .eq("id", session.id).single();
  if (error) throw error;
  if (!participant.paper_consent_confirmed_at) {
    return <main className="workspace panel document"><h1>서면 동의 확인 대기</h1><p>진행자가 서면 동의를 확인한 뒤 이 페이지를 새로고침해 주세요.</p></main>;
  }
  if (participant.status === "declined" || participant.status === "stopped") {
    return <main className="workspace panel document"><h1>참여가 종료되었습니다.</h1></main>;
  }
  if (participant.status === "completed") {
    return <main className="workspace panel document"><h1>참여가 완료되었습니다.</h1><p>감사합니다. 진행자에게 완료 사실을 알려주세요.</p></main>;
  }
  const assignment = await getPilotAssignment(session.id);
  return <Preview pilot={{ participantCode: session.participant_code, assignment }} />;
}
