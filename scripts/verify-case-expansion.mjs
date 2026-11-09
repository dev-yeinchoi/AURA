import {createHash,randomBytes,randomInt} from "node:crypto";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";

const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const code=`PT-9${String(randomInt(0,1_000_000)).padStart(6,"0")}`;
const token=randomBytes(32).toString("base64url");
let id;
async function checked(promise){const result=await promise;if(result.error)throw result.error;return result.data;}
try{
  const stimulus=(await checked(db.from("stimulus_sets").select("version").limit(1).single())).version;
  id=(await checked(db.from("participants").insert({participant_code:code,phase:"pilot",status:"in_progress"}).select("id").single())).id;
  await checked(db.from("assignments").insert({participant_id:id,authority_cue:"high",explanation_type:"case",sequence_code:"A-L_B-H",stimulus_version:stimulus}));
  await checked(db.from("rounds").insert({participant_id:id,round_no:1,risk_level:"low",form_code:"A"}));
  await checked(db.from("page_visits").insert({participant_id:id,round_no:1,page_key:"advice"}));
  await checked(db.from("participant_sessions").insert({participant_id:id,token_digest:createHash("sha256").update(token).digest("hex"),expires_at:new Date(Date.now()+3600000).toISOString()}));
  for(const expanded of [true,false]){
    const response=await fetch("http://localhost:3000/api/pilot/case-expansion",{method:"POST",headers:{"Content-Type":"application/json",Cookie:`aura_session=${token}`},body:JSON.stringify({round:1,employeeId:"A01",expanded})});
    assert.equal(response.status,200,JSON.stringify(await response.json()));
  }
  const rows=await checked(db.from("case_expansion_events").select("employee_id,expanded").eq("participant_id",id).order("changed_at"));
  assert.deepEqual(rows,[{employee_id:"A01",expanded:true},{employee_id:"A01",expanded:false}]);
  console.log("case-expansion API→DB: 직원 A01 펼침/접힘 2건 확인");
}finally{
  if(id){for(const table of ["case_expansion_events","page_visits","participant_sessions","rounds","assignments","participants"]){const field=table==="participants"?"id":"participant_id";const result=await db.from(table).delete().eq(field,id);if(result.error)console.error(`cleanup ${table}: ${result.error.message}`);}}
}
