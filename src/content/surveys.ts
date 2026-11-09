import source from "./figma-source.json";
export type Question = {id:string; text:string; options:string[]};
const byFrame=(id:string)=>source.frames.find(f=>f.id===id)!.texts;
export const text=(id:string)=>source.frames.flatMap(f=>f.texts).find(t=>t.id===id)!.text;
export const five=["전혀 동의하지 않음","동의하지 않음","보통","동의함","매우 동의함"];
export const seven=["전혀 동의하지 않음","동의하지 않음","약간 동의하지 않음","보통","약간 동의함","동의함","매우 동의함"];
const numbered=(frame:string,options:string[]):Question[]=>byFrame(frame).filter(t=>/^\d+\./.test(t.text)).map(t=>({...t,options}));
export const ppd=numbered("383:68",five);
export const ncsOptions=["1점 · 전혀 나와 같지 않다","2점 · 별로 나와 같지 않다","3점 · 보통이다","4점 · 조금 나와 같다","5점 · 매우 나와 같다"];
export const ncs:Question[]=[
  "나는 단순한 문제보다 복잡한 문제를 선호한다.",
  "나는 많은 생각이 필요한 상황을 책임지고 해결하는 것을 좋아한다.",
  "생각하는 것은 나에게 즐거운 일이 아니다.",
  "사고력을 발휘해야 하는 일보다 생각을 적게 해도 되는 일을 선호한다.",
  "나는 문제에 대한 새로운 해결책을 찾아내는 일을 즐긴다.",
  "나는 생각을 많이 하지 않아도 되는 어느 정도 중요한 일보다, 지적으로 어렵고 중요하며 도전적인 일을 선호한다.",
].map((question,index)=>({id:`ncs_${String(index+1).padStart(2,"0")}`,text:`${index+1}. ${question}`,options:ncsOptions}));
export const attention:Record<"low"|"high",Question>={
  low:{id:"task",text:"이번 과제에서 수행할 의사결정은 무엇인가요?",options:["사내 정기 행사 진행자","사내 동아리 운영진","회사의 인사평가 담당자","직원의 조직 운영 경험 조사"]},
  high:{id:"task",text:"이번 과제에서 수행할 의사결정은 무엇인가요?",options:["사내 친목 행사 일정 조정","직원의 취미활동 조사","사내 중요 프로젝트 예산 관리 역할 배정","사내 동아리 예산 담당 총무 결정"]},
};
export const attentionCorrectAnswer={low:2,high:3} as const;
export const riskQuestions=numbered("387:219",five);
export const trust=numbered("398:693",seven);
export const checks=["438:1215","438:1226","438:1237"].map(id=>({id,text:text(id),options:five}));
export const usability=["438:1180","438:1195"].map(id=>({id,text:text(id),options:seven}));
export const demographics:Question[]=[
  {id:"gender",text:text("412:2891"),options:["여성","남성","기타","응답하지 않음"]},
  {id:"education",text:text("412:2897"),options:["고등학교 졸업 이하","대학교 재학 중","학사 졸업","석사과정 재학","석사 졸업","박사과정 재학 이상","기타"]},
  {id:"ai-use",text:text("412:2906"),options:["매일 또는 거의 매일 (주 6~7일)","주 3~5일","주 1~2일","월 1~3일",text("I412:2913;362:12"),"한 번도 사용한 경험이 없음"]},
];
export const scenario={low:["388:230","388:231","388:232","388:233","388:234"].map(text),high:["388:255","388:256","388:257","388:258","388:259"].map(text)};
