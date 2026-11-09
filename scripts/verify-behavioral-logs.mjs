import {createHash,randomBytes,randomInt,randomUUID} from "node:crypto";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import stimuli from "../src/content/stimuli-v2.json" with {type:"json"};
import {checks,trust,usability} from "../src/content/surveys.ts";

const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,
  {auth:{persistSession:false,autoRefreshToken:false}});
const code=`PT-9${String(randomInt(0,1_000_000)).padStart(6,"0")}`;
const token=randomBytes(32).toString("base64url");
const base=process.env.AURA_TEST_BASE_URL??"http://localhost:3000";
let id;
async function checked(promise){const result=await promise;if(result.error)throw result.error;return result.data;}
async function api(path,body){const response=await fetch(`${base}${path}`,{
  method:"POST",headers:{"Content-Type":"application/json",Cookie:`aura_session=${token}`},
  body:JSON.stringify(body),
});const json=await response.json();assert.equal(response.status,200,`${path}: ${JSON.stringify(json)}`);return json;}
try{
  const stimulus=(await checked(db.from("stimulus_sets").select("version").limit(1).single())).version;
  const now=new Date().toISOString();
  id=(await checked(db.from("participants").insert({participant_code:code,phase:"pilot",
    status:"in_progress",started_at:now,online_consent_confirmed_at:now,
    consent_document_version:"SYNTHETIC_TEST_NO_HUMAN_PARTICIPANT"}).select("id").single())).id;
  await checked(db.from("assignments").insert({participant_id:id,authority_cue:"high",
    explanation_type:"case",sequence_code:"A-L_B-H",stimulus_version:stimulus}));
  const round=await checked(db.from("rounds").insert({participant_id:id,round_no:1,
    risk_level:"low",form_code:"A"}).select("id").single());
  const round2=await checked(db.from("rounds").insert({participant_id:id,round_no:2,
    risk_level:"high",form_code:"B"}).select("id").single());
  await checked(db.from("page_visits").insert({participant_id:id,page_key:"ncs"}));
  await checked(db.from("participant_sessions").insert({participant_id:id,
    token_digest:createHash("sha256").update(token).digest("hex"),
    expires_at:new Date(Date.now()+3600000).toISOString()}));

  const ncsRaw=[1,2,3,4,5,1];
  const ncsAnswers=Object.fromEntries(ncsRaw.map((value,i)=>[`ncs_${String(i+1).padStart(2,"0")}`,value]));
  await api("/api/pilot/event",{stage:"scenario",round:1,scenarioSegment:1,
    previousStage:"ncs",previousRound:null,answers:ncsAnswers});
  const ncs=await checked(db.from("analysis_ncs_scores").select("*").eq("participant_id",id).single());
  assert.deepEqual(ncsRaw,ncsRaw.map((_,i)=>ncs[`raw_${i+1}`]));
  assert.equal(ncs.scored_3,3);assert.equal(ncs.scored_4,2);
  assert.equal(ncs.scale_total,14);assert.equal(Number(ncs.scale_mean),14/6);

  for(const segment of [2,1,2])await api("/api/pilot/scenario-segment",{round:1,segment});
  await api("/api/pilot/event",{stage:"attention",round:1,
    previousStage:"scenario",previousRound:1});
  const segments=await checked(db.from("scenario_segment_visits").select("segment_no,wall_ms,left_at,risk_level,round_id")
    .eq("participant_id",id).order("entered_at"));
  assert.deepEqual(segments.map(s=>s.segment_no),[1,2,1,2]);
  assert(segments.every(s=>s.left_at&&s.wall_ms>=0&&s.risk_level==="low"&&s.round_id===round.id));

  await api("/api/pilot/event",{stage:"risk",round:1,previousStage:"attention",
    previousRound:1,answers:{task:1}});
  const attention=await checked(db.from("attention_check_responses").select("*").eq("participant_id",id).single());
  assert.equal(attention.selected_option,1);assert.equal(attention.correct_option,2);
  assert.equal(attention.is_correct,false);assert(attention.response_ms>=0);
  assert.equal(attention.round_id,round.id);assert.equal(attention.risk_level,"low");
  const rawAttention=await checked(db.from("survey_answers").select("answer_number")
    .eq("participant_id",id).eq("instrument","attention_check").single());
  assert.equal(rawAttention.answer_number,1);

  await checked(db.from("page_visits").update({left_at:new Date().toISOString(),wall_ms:0,
    exit_reason:"synthetic_setup"}).eq("participant_id",id).eq("page_key","risk"));
  const adviceVisit=await checked(db.from("page_visits").insert({participant_id:id,round_no:1,page_key:"advice"}).select("id").single());
  const eventKey=randomUUID();
  await api("/api/pilot/case-expansion",{round:1,employeeId:"A01",expanded:true,eventKey});
  await api("/api/pilot/case-expansion",{round:1,employeeId:"A01",expanded:true,eventKey});
  await api("/api/pilot/case-expansion",{round:1,employeeId:"A01",expanded:false,eventKey:randomUUID()});
  await api("/api/pilot/case-expansion",{round:1,employeeId:"A01",expanded:true,eventKey:randomUUID()});
  await api("/api/pilot/case-expansion",{round:1,employeeId:"A02",expanded:true,eventKey:randomUUID()});
  await api("/api/pilot/case-expansion",{round:1,employeeId:"A01",expanded:false,eventKey:randomUUID()});
  await api("/api/pilot/presence",{stage:"advice",round:1,sentAt:Date.now(),visitId:adviceVisit.id});
  await api("/api/pilot/presence",{stage:"advice",round:1,sentAt:Date.now(),visitId:adviceVisit.id});
  const summaries=await checked(db.from("case_expansion_summary").select("*")
    .eq("participant_id",id).order("employee_id"));
  assert.equal(summaries.length,2);
  assert.deepEqual(summaries.map(s=>[s.employee_id,s.view_count,s.final_expanded]),
    [["A01",2,false],["A02",1,false]]);
  assert(summaries.every(s=>s.round_id===round.id&&s.risk_level==="low"&&
    s.first_viewed_at&&s.accumulated_open_ms>=0));
  const events=await checked(db.from("case_expansion_events").select("employee_id,expanded,changed_at")
    .eq("participant_id",id));
  assert.equal(events.length,6);

  const decisionRows=[];
  for(const employee of stimuli.forms.A){for(const stage of ["initial","final"]){
    decisionRows.push({participant_id:id,round_no:1,employee_id:employee.id,
      stage,choice:stage==="initial"?0:1,selected_at:now,submitted_at:now});
  }}
  await checked(db.from("decisions").insert(decisionRows));
  const criteria=await checked(db.from("analysis_round_criteria").select("*").eq("participant_id",id));
  assert.equal(criteria.length,2);
  const initial=criteria.find(row=>row.stage==="initial");
  const final=criteria.find(row=>row.stage==="final");
  assert.equal(initial.assigned_count,0);assert.equal(initial.mandatory_violation_rate,null);
  assert.equal(initial.mandatory_pass_count,7);assert.equal(initial.mandatory_pass_omissions,7);
  assert.equal(Number(initial.mandatory_pass_omission_rate),1);
  assert.equal(final.assigned_count,12);assert.equal(final.mandatory_violation_assignments,5);
  assert.equal(Number(final.mandatory_violation_rate),5/12);
  assert.equal(final.fully_eligible_count,5);assert.equal(final.fully_eligible_assigned,5);
  const reliance=await checked(db.from("analysis_round_reliance").select("*").eq("participant_id",id).single());
  assert(reliance.rair_denominator>=0&&reliance.rsr_denominator>=0);

  await checked(db.from("page_visits").insert({participant_id:id,round_no:1,page_key:"final"}));
  await api("/api/pilot/event",{stage:"trust",round:1,previousStage:"final",
    previousRound:1,decisions:Object.fromEntries(stimuli.forms.A.map(e=>[e.id,1]))});
  const preserved=await checked(db.from("decisions").select("selected_at")
    .eq("participant_id",id).eq("round_no",1).eq("stage","final"));
  assert(preserved.every(row=>Date.parse(row.selected_at)===Date.parse(now)));
  await api("/api/pilot/event",{stage:"scenario",round:2,scenarioSegment:1,
    previousStage:"trust",previousRound:1,
    answers:Object.fromEntries(trust.map(q=>[q.id,1]))});
  await api("/api/pilot/scenario-segment",{round:2,segment:2});
  await api("/api/pilot/event",{stage:"attention",round:2,
    previousStage:"scenario",previousRound:2});
  await api("/api/pilot/event",{stage:"risk",round:2,
    previousStage:"attention",previousRound:2,answers:{task:1}});
  const highAttention=await checked(db.from("attention_check_responses").select("*")
    .eq("participant_id",id).eq("round_no",2).single());
  assert.equal(highAttention.risk_level,"high");assert.equal(highAttention.round_id,round2.id);
  assert.equal(highAttention.correct_option,3);assert.equal(highAttention.is_correct,false);
  const highSegments=await checked(db.from("scenario_segment_visits").select("segment_no,round_id")
    .eq("participant_id",id).eq("round_no",2));
  assert.deepEqual(highSegments.map(s=>s.segment_no),[1,2]);
  assert(highSegments.every(s=>s.round_id===round2.id));
  await checked(db.from("page_visits").update({left_at:new Date().toISOString(),wall_ms:0,
    exit_reason:"synthetic_setup"}).eq("participant_id",id).eq("page_key","risk").eq("round_no",2));
  await checked(db.from("page_visits").insert({participant_id:id,page_key:"post"}));
  const postAnswers={accuracy:50};
  for(const q of [...checks,...usability])postAnswers[q.id]=1;
  await api("/api/pilot/event",{stage:"done",round:null,previousStage:"post",
    previousRound:null,answers:postAnswers});
  const blank=await checked(db.from("survey_answers").select("answer_text")
    .eq("participant_id",id).eq("instrument","free_text").single());
  assert.equal(blank.answer_text,"");
  console.log("API→DB 검증 통과: NCS 원점수/역채점, Low→High 전환과 시나리오 부분별 방문, 두 Risk의 오답 Attention Check, 직원별 사례 6개 이벤트, 조건 준수/RAIR·RSR 조회, 빈 자유서술 완료");
}finally{
  if(id){for(const table of ["attention_check_responses","scenario_segment_visits",
    "case_expansion_events","case_expansion_summary","survey_answers","decisions",
    "page_visits","participant_sessions","rounds","assignments","participants"]){
    const field=table==="participants"?"id":"participant_id";
    const result=await db.from(table).delete().eq(field,id);
    if(result.error)console.error(`합성 기록 정리 실패 ${table}: ${result.error.message}`);
  }}
}
