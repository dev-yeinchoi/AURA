import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {reliance,truth} from "../src/lib/experiment.ts";
import {scoreNcs6} from "../src/lib/ncs.ts";

const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,
  {auth:{persistSession:false,autoRefreshToken:false}});
async function rows(name){
  const result=[];
  for(let start=0;;start+=500){
    let query=db.from(name).select("*").order("participant_id").range(start,start+499);
    if(!["analysis_ncs_scores"].includes(name))query=query.order("round_no");
    if(name==="analysis_employee_decisions")query=query.order("employee_id").order("stage");
    if(name==="analysis_round_criteria")query=query.order("stage");
    if(name==="case_expansion_summary"||name==="case_expansion_events")query=query.order("employee_id");
    if(name==="scenario_segment_visits")query=query.order("entered_at");
    const {data,error}=await query;if(error)throw error;
    result.push(...data);if(data.length<500)break;
  }
  return result;
}
const [employees,criteria,relianceRows,ncsRows,attention,cases,caseEvents,segments]=await Promise.all([
  rows("analysis_employee_decisions"),rows("analysis_round_criteria"),
  rows("analysis_round_reliance"),rows("analysis_ncs_scores"),
  rows("attention_check_responses"),rows("case_expansion_summary"),
  rows("case_expansion_events"),rows("scenario_segment_visits"),
]);
const close=(actual,expected)=>actual===null?assert.equal(expected,null):
  assert(Math.abs(Number(actual)-Number(expected))<1e-9,`${actual} != ${expected}`);
for(const row of employees){
  const mandatory=row.weekly_hours>=2&&row.on_time_count>=3&&row.requirements_count>=5;
  const additional=row.experience_months>=6||row.requirements_count===6;
  assert.equal(row.mandatory_pass,mandatory);
  assert.equal(row.additional_pass,additional);
  assert.equal(row.eligible,Boolean(truth([row.experience_months,row.weekly_hours,
    row.on_time_count,row.requirements_count])));
  assert.equal(row.ground_truth,row.eligible);
}
for(const aggregate of criteria){
  const group=employees.filter(row=>row.participant_id===aggregate.participant_id&&
    row.round_no===aggregate.round_no&&row.stage===aggregate.stage);
  const assigned=group.filter(row=>row.choice===1);
  const mandatory=group.filter(row=>row.mandatory_pass);
  const eligible=mandatory.filter(row=>row.additional_pass);
  const violations=assigned.filter(row=>!row.mandatory_pass).length;
  const omissions=mandatory.filter(row=>row.choice===0).length;
  assert.equal(aggregate.employee_count,group.length);
  assert.equal(aggregate.assigned_count,assigned.length);
  assert.equal(aggregate.mandatory_violation_assignments,violations);
  assert.equal(aggregate.mandatory_pass_count,mandatory.length);
  assert.equal(aggregate.mandatory_pass_omissions,omissions);
  close(aggregate.mandatory_violation_rate,assigned.length?violations/assigned.length:null);
  close(aggregate.mandatory_pass_omission_rate,mandatory.length?omissions/mandatory.length:null);
  assert.equal(aggregate.fully_eligible_count,eligible.length);
  assert.equal(aggregate.fully_eligible_assigned,eligible.filter(row=>row.choice===1).length);
  assert.equal(aggregate.fully_eligible_held,eligible.filter(row=>row.choice===0).length);
  close(aggregate.fully_eligible_assignment_rate,eligible.length?
    eligible.filter(row=>row.choice===1).length/eligible.length:null);
}
for(const aggregate of relianceRows){
  const group=employees.filter(row=>row.participant_id===aggregate.participant_id&&
    row.round_no===aggregate.round_no);
  const pairs=new Map();
  for(const row of group){const pair=pairs.get(row.employee_id)??{
    a:Number(row.ai_recommended),y:Number(row.ground_truth)};
    pair[row.stage==="initial"?"h":"f"]=row.choice;pairs.set(row.employee_id,pair);}
  assert.equal(pairs.size,12);
  const expected=reliance([...pairs.values()]);
  assert.equal(aggregate.rair_denominator,expected.rair.denominator);
  assert.equal(aggregate.rair_numerator,expected.rair.numerator);
  assert.equal(aggregate.rsr_denominator,expected.rsr.denominator);
  assert.equal(aggregate.rsr_numerator,expected.rsr.numerator);
  close(aggregate.rair,expected.rair.value);close(aggregate.rsr,expected.rsr.value);
}
for(const row of ncsRows){const raw=[1,2,3,4,5,6].map(i=>row[`raw_${i}`]);
  const score=scoreNcs6(raw);assert.equal(row.scored_3,score.items[2]);
  assert.equal(row.scored_4,score.items[3]);assert.equal(row.scale_total,score.total);
  close(row.scale_mean,score.mean);
}
for(const row of attention){assert.equal(row.is_correct,row.selected_option===row.correct_option);
  assert.equal(row.correct_option,row.risk_level==="low"?2:3);}
for(const row of cases){const events=caseEvents.filter(event=>event.participant_id===row.participant_id&&
  event.round_no===row.round_no&&event.employee_id===row.employee_id);
  assert.equal(row.view_count,events.filter(event=>event.expanded).length);
  assert(row.accumulated_open_ms>=0);
}
for(const row of segments){assert(row.wall_ms===null||row.wall_ms>=0);
  assert(row.segment_no===1||row.segment_no===2);}
console.log(`DB 분석 조회 검증 통과: 직원 판단 ${employees.length}행, 조건 집계 ${criteria.length}행, RAIR/RSR ${relianceRows.length}행, NCS ${ncsRows.length}행, Attention ${attention.length}행, 사례 ${cases.length}건, 시나리오 부분 ${segments.length}건`);
