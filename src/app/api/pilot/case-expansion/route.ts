import {NextResponse} from "next/server";
import {getParticipantSession} from "@/lib/participant-session";
import {createSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const session=await getParticipantSession();
    if(!session||session.phase!=="pilot")return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
    const body=await request.json();
    if((body.round!==1&&body.round!==2)||typeof body.employeeId!=="string"||typeof body.expanded!=="boolean")return NextResponse.json({error:"기록 값이 올바르지 않습니다."},{status:400});
    const db=createSupabaseAdmin();
    const [assignment,round,visit]=await Promise.all([
      db.from("assignments").select("explanation_type").eq("participant_id",session.id).single(),
      db.from("rounds").select("form_code").eq("participant_id",session.id).eq("round_no",body.round).single(),
      db.from("page_visits").select("id").eq("participant_id",session.id).eq("round_no",body.round).eq("page_key","advice").is("left_at",null).limit(1).maybeSingle(),
    ]);
    if(assignment.error||round.error||visit.error)throw assignment.error??round.error??visit.error;
    if(assignment.data.explanation_type!=="case"||!new RegExp(`^${round.data.form_code}(0[1-9]|1[0-2])$`).test(body.employeeId)||!visit.data)return NextResponse.json({error:"현재 유사 사례 화면이 아닙니다."},{status:403});
    const {error}=await db.from("case_expansion_events").insert({participant_id:session.id,round_no:body.round,employee_id:body.employeeId,expanded:body.expanded});
    if(error)throw error;
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Case expansion storage failed",error);return NextResponse.json({error:"유사 사례 열람 기록을 저장하지 못했습니다."},{status:503});}
}
