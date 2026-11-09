import test from "node:test";
import assert from "node:assert/strict";
import data from "../src/content/stimuli-v2.json";
import {truth,recommendation,contributions,reliance,sequences,type Features} from "../src/lib/experiment";
import {createPreview,normalizePreviewOrder,saveDecision,advance} from "../src/lib/preview-state";
import {attention,attentionCorrectAnswer,ncs,ppd,riskQuestions,trust as trustQuestions,checks,usability,scenario} from "../src/content/surveys";
import {scoreNcs6} from "../src/lib/ncs";

test("두 폼의 실험 구성은 TP3 FP2 TN5 FN2",()=>{
 for(const form of Object.values(data.forms)){
  const counts={TP:0,FP:0,TN:0,FN:0};
  for(const row of form){const v=row.v as unknown as Features;assert.equal(truth(v),+row.y);assert.equal(recommendation(v),+row.ai);assert.deepEqual(contributions(v),row.fi);counts[row.type as keyof typeof counts]++;assert.ok(row.v[0]>=1);}
  assert.deepEqual(counts,{TP:3,FP:2,TN:5,FN:2});
 }
});
test("사례는 같은 계산식을 사용하고 연결은 정답을 보지 않은 최근접 사례",()=>{
 for(const c of data.cases){assert.equal(truth(c.v as unknown as Features),+c.y);assert.equal(recommendation(c.v as unknown as Features),+c.ai);assert.deepEqual(contributions(c.v as unknown as Features),c.fi);}
 for(const row of [...data.forms.A,...data.forms.B]){
  const distance=(c:typeof data.cases[number])=>Math.abs(c.v[0]-row.v[0])+3*Math.abs(c.v[1]-row.v[1])+3*Math.abs(c.v[2]-row.v[2])+2*Math.abs(c.v[3]-row.v[3]);
  const nearest=[...data.cases].sort((a,b)=>distance(a)-distance(b)||a.id.localeCompare(b.id))[0];
  assert.equal(nearest.id,row.case);
 }
});
test("RAIR/RSR의 분모는 조건부이며 기회 없음은 null",()=>{
 assert.deepEqual(reliance([]),{rair:{numerator:0,denominator:0,value:null},rsr:{numerator:0,denominator:0,value:null}});
 const result=reliance([{h:0,a:1,y:1,f:1},{h:1,a:0,y:1,f:0},{h:1,a:1,y:1,f:1}]);
 assert.deepEqual(result,{rair:{numerator:1,denominator:1,value:1},rsr:{numerator:0,denominator:1,value:0}});
});
test("초기 응답이 모두 있어야 AI로 이동하며 이후 초기 응답이 변경되지 않음",()=>{
 let s=createPreview("high","case",0,[data.forms.A.map(e=>e.id),data.forms.B.map(e=>e.id)]);s.stage="initial";
 assert.deepEqual(s.order[0],data.forms.A.map(e=>e.id).sort());
 assert.throws(()=>advance(s));
 for(const id of s.order[0])s=saveDecision(s,id,0);
 const order=[...s.order[0]];s=advance(s);assert.equal(s.stage,"loading");assert.throws(()=>saveDecision(s,"A01",1));
 s=advance(s,s.enteredAt+10000);assert.equal(s.stage,"advice");assert.throws(()=>advance(s,s.enteredAt+29999));s=advance(s,s.enteredAt+30000);assert.equal(s.stage,"final");assert.deepEqual(s.order[0],order);
 assert.equal(s.decisions["0:final:A01"],undefined);
 s=saveDecision(s,"A01",1);assert.equal(s.decisions["0:initial:A01"],0);
});
test("기존 미리보기 순서를 정렬하면서 현재 직원은 유지",()=>{
 const s=createPreview("low","none",0,[data.forms.A.map(e=>e.id),data.forms.B.map(e=>e.id)]);
 s.order[0].reverse();s.index=2;
 const current=s.order[0][s.index];
 const normalized=normalizePreviewOrder(s);
 assert.deepEqual(normalized.order[0],data.forms.A.map(e=>e.id).sort());
 assert.equal(normalized.order[0][normalized.index],current);
});
test("피그마 원문 문항 수·척도 및 사용자 선택 High 원문 보존",()=>{
 assert.equal(ppd.length,15);assert.equal(riskQuestions.length,4);assert.equal(trustQuestions.length,3);assert.equal(checks.length,3);assert.equal(usability.length,2);
 assert.equal(ppd[0].options.length,5);assert.equal(trustQuestions[0].options.length,7);
 assert.ok(scenario.high[0].includes("예산 관리 총괄팀"));assert.ok(scenario.high[1].includes("당신의 공식 성과평가"));
});
test("NCS-6은 PPD 다음이고 시나리오는 두 부분과 30초를 거쳐 이해도 확인으로 진행",()=>{
 let s=createPreview("low","none",0,[data.forms.A.map(e=>e.id),data.forms.B.map(e=>e.id)]);
 s.stage="ppd";s=advance(s);assert.equal(s.stage,"ncs");s=advance(s);assert.equal(s.stage,"scenario");
 assert.throws(()=>advance(s,s.enteredAt+30000));
 s={...s,scenarioPage:1};assert.throws(()=>advance(s,s.enteredAt+29999));
 s=advance(s,s.enteredAt+30000);assert.equal(s.stage,"attention");assert.throws(()=>advance(s));
 s={...s,answers:{"0:attention:task":1}};s=advance(s);assert.equal(s.stage,"risk");
 assert.equal(ncs.length,6);assert.equal(ncs[0].options.length,5);
 assert.equal(attention.low.options[attentionCorrectAnswer.low-1],"사내 동아리 운영진");
 assert.equal(attention.high.options[attentionCorrectAnswer.high-1],"사내 중요 프로젝트 예산 관리 역할 배정");
});
test("NCS-6은 3·4번만 역채점하며 원응답 배열을 바꾸지 않음",()=>{
 const raw=[1,2,1,5,4,3];
 assert.deepEqual(scoreNcs6(raw),{items:[1,2,5,1,4,3],total:16,mean:16/6});
 assert.deepEqual(raw,[1,2,1,5,4,3]);
 assert.throws(()=>scoreNcs6([1,2,0,4,5,5]));
});
test("시나리오와 AI 정보는 각 단계 진입 시각부터 따로 30초를 셈",()=>{
 let s=createPreview("low","case",0,[data.forms.A.map(e=>e.id),data.forms.B.map(e=>e.id)]);
 s={...s,stage:"scenario",scenarioPage:1,enteredAt:1000};
 s=advance(s,31000);assert.equal(s.stage,"attention");assert.equal(s.enteredAt,31000);
 s={...s,stage:"advice",enteredAt:40000};
 assert.throws(()=>advance(s,69999));
 assert.equal(advance(s,70000).stage,"final");
});
test("네 순서는 두 Risk와 두 폼을 한 번씩 사용",()=>{for(const s of sequences){assert.equal(new Set(s.map(r=>r.risk)).size,2);assert.equal(new Set(s.map(r=>r.form)).size,2);}});
