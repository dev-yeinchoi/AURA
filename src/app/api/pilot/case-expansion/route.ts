import {NextResponse} from "next/server";
import {getParticipantSession} from "@/lib/participant-session";
import {createSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const session=await getParticipantSession();
    if(!session||session.phase!=="pilot")return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
    const body=await request.json();
    if((body.round!==1&&body.round!==2)||typeof body.employeeId!=="string"||typeof body.expanded!=="boolean"||
      (body.eventKey!==undefined&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.eventKey)))
      return NextResponse.json({error:"기록 값이 올바르지 않습니다."},{status:400});
    const db=createSupabaseAdmin();
    const {data,error}=await db.rpc("record_case_expansion",{
      p_participant_id:session.id,p_round_no:body.round,
      p_employee_id:body.employeeId,p_expanded:body.expanded,p_event_key:body.eventKey??null,
    });
    if(error)throw error;
    return NextResponse.json({ok:true,summary:data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Case expansion storage failed",error);return NextResponse.json({error:"유사 사례 열람 기록을 저장하지 못했습니다."},{status:503});}
}
