import {NextResponse} from "next/server";
import {getParticipantSession} from "@/lib/participant-session";
import {createSupabaseAdmin} from "@/lib/supabase-admin";
import {stages,type Stage} from "@/lib/preview-state";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const session=await getParticipantSession();
    if(!session||session.phase!=="pilot")return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
    const body=await request.json() as {stage:Stage;round:number|null;sentAt:number;visitId?:string|null};
    if(!stages.includes(body.stage)||(body.round!==null&&body.round!==1&&body.round!==2)||
      !Number.isFinite(body.sentAt)||(body.visitId!=null&&!/^[0-9a-f-]{36}$/i.test(body.visitId)))
      return NextResponse.json({error:"화면 정보가 올바르지 않습니다."},{status:400});
    const db=createSupabaseAdmin();
    let query=db.from("page_visits")
      .select("id,entered_at").eq("participant_id",session.id)
      .eq("page_key",body.stage)
      .is("left_at",null).order("entered_at",{ascending:false}).limit(1);
    query=body.round===null?query.is("round_no",null):query.eq("round_no",body.round);
    if(body.visitId)query=query.eq("id",body.visitId);
    const {data:visit,error}=await query.maybeSingle();
    if(error)throw error;
    if(!visit||(!body.visitId&&Date.parse(visit.entered_at)>body.sentAt+1000))
      return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    if(body.stage==="scenario"&&(body.round===1||body.round===2)){
      const result=await db.rpc("record_scenario_segment",{
        p_participant_id:session.id,p_round_no:body.round,p_segment_no:null,p_exit_reason:"hidden",
      });
      if(result.error)throw result.error;
    }
    if(body.stage==="advice"&&(body.round===1||body.round===2)){
      const result=await db.rpc("close_open_case_expansions",{
        p_participant_id:session.id,p_round_no:body.round,p_origin:"hidden",
      });
      if(result.error)throw result.error;
    }
    const now=new Date();
    const {error:closeError}=await db.from("page_visits").update({
      left_at:now.toISOString(),last_seen_at:now.toISOString(),
      wall_ms:Math.max(0,now.getTime()-Date.parse(visit.entered_at)),exit_reason:"hidden",
    }).eq("id",visit.id).is("left_at",null);
    if(closeError)throw closeError;
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Pilot presence storage failed",error);return NextResponse.json({error:"열람 시간을 저장하지 못했습니다."},{status:503});}
}
