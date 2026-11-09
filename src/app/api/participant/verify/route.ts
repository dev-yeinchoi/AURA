import {createHash, randomBytes} from "node:crypto";
import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {createSupabaseAdmin} from "@/lib/supabase-admin";

export const runtime = "nodejs";
const COOKIE = "aura_identity_pending";
const invalid = () => NextResponse.json({error:"참가자 번호 또는 전화번호 뒤 4자리를 확인해 주세요. 여러 번 실패하면 15분 후 다시 시도할 수 있습니다."},{status:401,headers:{"Cache-Control":"no-store"}});

export async function POST(request:Request){
  let body:unknown;
  try{body=await request.json();}catch{return invalid();}
  if(!body||typeof body!=="object")return invalid();
  const {code,phoneLast4}=body as Record<string,unknown>;
  if(typeof code!=="string"||typeof phoneLast4!=="string")return invalid();
  const normalized=code.trim().toUpperCase();
  if(!/^(PT|MT)-\d{3,}$/.test(normalized)||!/^\d{4}$/.test(phoneLast4))return invalid();
  try{
    const db=createSupabaseAdmin();
    const {data,error}=await db.rpc("verify_participant_identity",{p_code:normalized,p_phone_last4:phoneLast4});
    if(error)throw error;
    if(!data)return invalid();
    const token=randomBytes(32).toString("base64url");
    const digest=createHash("sha256").update(token).digest("hex");
    const {error:challengeError}=await db.from("participant_identity_challenges").insert({token_digest:digest,participant_id:data.participantId,expires_at:new Date(Date.now()+10*60_000).toISOString()});
    if(challengeError)throw challengeError;
    (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
    return NextResponse.json({participantCode:data.participantCode,maskedName:data.maskedName,maskedPhone:data.maskedPhone},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Participant identity verification failed",error);return NextResponse.json({error:"현재 참가자 확인을 완료하지 못했습니다. 진행자에게 문의해 주세요."},{status:503});}
}
