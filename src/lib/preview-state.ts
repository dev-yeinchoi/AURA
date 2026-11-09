import {sequences,type Binary,type Authority,type Explanation} from "./experiment";
export const stages=["information","consent","demographics","ppd","ncs","scenario","attention","risk","browse","initial","loading","advice","final","trust","post","done","declined"] as const;
export type Stage=typeof stages[number];
export type PreviewState={version:1; mode:"preview"; authority:Authority; explanation:Explanation; sequence:number; round:0|1; stage:Stage; enteredAt:number; scenarioPage:0|1; secondRoundIntroSeen:boolean; order:string[][]; index:number; answers:Record<string,number|string>; decisions:Record<string,Binary>; events:{stage:Stage;round:number;enteredAt:number;submittedAt:number}[]};
const sortIds=(ids:string[])=>[...ids].sort((a,b)=>a.localeCompare(b,"en",{numeric:true}));
export function normalizePreviewOrder(state:PreviewState):PreviewState {
  const currentId=state.order[state.round][state.index];
  const order=state.order.map(sortIds);
  return {...state,order,index:order[state.round].indexOf(currentId),scenarioPage:state.scenarioPage===1?1:0,secondRoundIntroSeen:state.secondRoundIntroSeen===true};
}
export function isPreviewState(value:unknown):value is PreviewState {
  if(!value || typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  if(v.version!==1 || v.mode!=="preview" || !["low","high"].includes(String(v.authority)) || !["none","fi","case"].includes(String(v.explanation)) || !stages.includes(v.stage as Stage))return false;
  if(!Number.isInteger(v.sequence) || Number(v.sequence)<0 || Number(v.sequence)>3 || (v.round!==0&&v.round!==1) || !Number.isInteger(v.index) || Number(v.index)<0 || Number(v.index)>11 || typeof v.enteredAt!=="number" || !Number.isFinite(v.enteredAt))return false;
  if(!Array.isArray(v.order) || v.order.length!==2 || !v.order.every((ids,r)=>Array.isArray(ids)&&ids.length===12&&new Set(ids).size===12&&ids.every(id=>typeof id==="string"&&new RegExp(`^${sequences[Number(v.sequence)][r].form}(0[1-9]|1[0-2])$`).test(id))))return false;
  if(!v.answers || typeof v.answers!=="object" || Array.isArray(v.answers) || !Object.values(v.answers).every(x=>typeof x==="string"||(typeof x==="number"&&Number.isFinite(x))))return false;
  return !!v.decisions && typeof v.decisions==="object" && !Array.isArray(v.decisions) && Object.values(v.decisions).every(x=>x===0||x===1) && Array.isArray(v.events);
}
export function createPreview(authority:Authority,explanation:Explanation,sequence:number,orders:string[][]):PreviewState {
  return {version:1,mode:"preview",authority,explanation,sequence,round:0,stage:"information",enteredAt:Date.now(),scenarioPage:0,secondRoundIntroSeen:false,order:orders.map(sortIds),index:0,answers:{},decisions:{},events:[]};
}
export function saveDecision(state:PreviewState,id:string,value:Binary):PreviewState {
  if(state.stage!=="initial" && state.stage!=="final")throw new Error("판단 단계가 아닙니다.");
  if(!state.order[state.round].includes(id))throw new Error("현재 라운드의 직원이 아닙니다.");
  return {...state,decisions:{...state.decisions,[`${state.round}:${state.stage}:${id}`]:value}};
}
export function advance(state:PreviewState,now=Date.now()):PreviewState {
  if(["initial","final"].includes(state.stage) && state.order[state.round].some(id=>state.decisions[`${state.round}:${state.stage}:${id}`]===undefined))throw new Error("12명의 판단이 필요합니다.");
  if(state.stage==="scenario" && (state.scenarioPage!==1 || now-state.enteredAt<30000 || (state.round===1&&!state.secondRoundIntroSeen)))throw new Error("상황 설명 두 부분을 모두 확인하고 30초 동안 읽어 주세요.");
  if(state.stage==="attention" && ![1,2,3,4].includes(Number(state.answers[`${state.round}:attention:task`])))throw new Error("이해도 확인 문항에 답해 주세요.");
  if(state.stage==="loading" && now-state.enteredAt<10000)throw new Error("AURA 확인 중입니다.");
  if(state.stage==="advice" && now-state.enteredAt<30000)throw new Error("AI 추천 정보를 30초 동안 확인해 주세요.");
  if(state.stage==="done" || state.stage==="declined")return state;
  let next:Stage=stages[stages.indexOf(state.stage)+1];
  let round=state.round;
  if(state.stage==="trust" && round===0){next="scenario";round=1;}
  return {...state,round,stage:next,index:0,scenarioPage:next==="scenario"?0:state.scenarioPage,secondRoundIntroSeen:next==="scenario"&&round===1?false:state.secondRoundIntroSeen,enteredAt:now,events:[...state.events,{stage:state.stage,round:state.round,enteredAt:state.enteredAt,submittedAt:now}]};
}
