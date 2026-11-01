import source from "./figma-source.json";
export type Question = {id:string; text:string; options:string[]};
const byFrame=(id:string)=>source.frames.find(f=>f.id===id)!.texts;
export const text=(id:string)=>source.frames.flatMap(f=>f.texts).find(t=>t.id===id)!.text;
export const five=["전혀 동의하지 않음","동의하지 않음","보통","동의함","매우 동의함"];
export const seven=["전혀 동의하지 않음","동의하지 않음","약간 동의하지 않음","보통","약간 동의함","동의함","매우 동의함"];
const numbered=(frame:string,options:string[]):Question[]=>byFrame(frame).filter(t=>/^\d+\./.test(t.text)).map(t=>({...t,options}));
export const ppd=numbered("383:68",five);
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
