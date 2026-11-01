export type Binary = 0 | 1;
export type Features = readonly [number, number, number, number];
export type Authority = "low" | "high";
export type Explanation = "none" | "fi" | "case";
export type Risk = "low" | "high";
export type Form = "A" | "B";
export const sequences: ReadonlyArray<ReadonlyArray<{form: Form; risk: Risk}>> = [
  [{form:"A",risk:"low"},{form:"B",risk:"high"}],
  [{form:"B",risk:"low"},{form:"A",risk:"high"}],
  [{form:"A",risk:"high"},{form:"B",risk:"low"}],
  [{form:"B",risk:"high"},{form:"A",risk:"low"}],
];
export function truth([e,t,d,p]: Features): Binary {
  return t>=2 && d>=3 && p>=5 && (e>=6 || p===6) ? 1 : 0;
}
export function contributions([e,t,d,p]: Features): number[] {
  return [2*(e-6),2*(t-2),3*(d-3),5*(p-5)];
}
export function recommendation(v: Features): Binary {
  return contributions(v).reduce((a,b)=>a+b,0)>=0 ? 1 : 0;
}
export function reliance(rows: {h:Binary; a:Binary; y:Binary; f:Binary}[]) {
  const ai=rows.filter(r=>r.h!==r.y && r.a===r.y);
  const self=rows.filter(r=>r.h===r.y && r.a!==r.y);
  const ratio=(rs:typeof rows)=>({numerator:rs.filter(r=>r.f===r.y).length,denominator:rs.length,
    value:rs.length ? rs.filter(r=>r.f===r.y).length/rs.length : null});
  return {rair:ratio(ai),rsr:ratio(self)};
}
export function shuffle<T>(items: readonly T[], random= Math.random): T[] {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export const featureNames=["운영 업무 경험 기간","주당 참여 가능 시간","기한 내 완료 건수","요구사항 충족 건수"];
export const featureHelp=["비슷한 업무를 얼마나 오래 맡아봤나요?","이번 업무에 매주 몇 시간을 쓸 수 있나요?","최근 맡은 업무를 약속한 기한 안에 마쳤나요?","완료했었던 업무들은 사전에 정한 요구사항을 충족했나요?"];
export const auraHelp=["비슷한 운영 업무를 맡아온 기간입니다.","이번 운영 업무에 매주 쓸 수 있는 시간입니다.","최근 4건 중 기한 안에 마친 업무 수입니다.","최근 6건 중 요구사항을 충족한 업무 수입니다."];
export function formatFeature(index:number,value:number) {
  return [`${value}개월`,`${value}시간/주`,`${value}건/4건`,`${value}건/6건`][index];
}
