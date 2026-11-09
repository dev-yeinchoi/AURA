import {NextResponse} from "next/server";
import {getParticipantSession} from "@/lib/participant-session";
import {createSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const session=await getParticipantSession();
    if(!session||session.phase!=="pilot")return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
    const body=await request.json();
    if((body.round!==1&&body.round!==2)||(body.segment!==1&&body.segment!==2))
      return NextResponse.json({error:"시나리오 단계가 올바르지 않습니다."},{status:400});
    const db=createSupabaseAdmin();
    const {error}=await db.rpc("record_scenario_segment",{
      p_participant_id:session.id,p_round_no:body.round,
      p_segment_no:body.segment,p_exit_reason:"segment_change",
    });
    if(error)throw error;
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Scenario segment storage failed",error);return NextResponse.json({error:"시나리오 열람 기록을 저장하지 못했습니다."},{status:503});}
}
