import {createHash} from "node:crypto";
import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {openParticipantSession} from "@/lib/participant-session";
import {createSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime="nodejs";
export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(body?.confirmed!==true)return NextResponse.json({error:"본인 정보 확인이 필요합니다."},{status:400});
  const store=await cookies();
  const token=store.get("aura_identity_pending")?.value;
  if(!token)return NextResponse.json({error:"참가자 정보를 다시 확인해 주세요."},{status:401});
  try{
    const db=createSupabaseAdmin();
    const {data,error}=await db.from("participant_identity_challenges")
      .update({consumed_at:new Date().toISOString()})
      .eq("token_digest",createHash("sha256").update(token).digest("hex"))
      .is("consumed_at",null).gt("expires_at",new Date().toISOString())
      .select("participant_id").maybeSingle();
    if(error)throw error;
    if(!data)return NextResponse.json({error:"확인 시간이 만료되었습니다. 다시 확인해 주세요."},{status:401});
    await openParticipantSession(data.participant_id);
    store.delete("aura_identity_pending");
    const {data:participant,error:readError}=await db.from("participants").select("participant_code").eq("id",data.participant_id).single();
    if(readError)throw readError;
    return NextResponse.json({participantCode:participant.participant_code},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Participant login failed",error);return NextResponse.json({error:"실험 시작을 완료하지 못했습니다. 진행자에게 문의해 주세요."},{status:503});}
}
