import type {Question} from "@/content/surveys";
export function Survey({questions,answers,onAnswer,vertical=false,columnsOverride}:{questions:Question[];answers:Record<string,number|string>;onAnswer:(id:string,value:number)=>void;vertical?:boolean;columnsOverride?:number}){
  return <>{questions.map(q=>{
    const demographic=["gender","education","ai-use"].includes(q.id);
    const columns=columnsOverride??(demographic?(q.id==="gender"?4:3):q.options.length);
    return <fieldset className={`question ${demographic?"demographic-question":""}`} key={q.id}><legend>{q.text}</legend><div className={`options ${!demographic&&(vertical||q.options.length===7)?"vertical-labels":""} ${demographic?"demographic-options":""}`} style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{q.options.map((label,i)=><label key={label}><input type="radio" name={q.id} value={i+1} checked={answers[q.id]===i+1} onChange={()=>onAnswer(q.id,i+1)}/><span>{label}</span></label>)}</div></fieldset>;
  })}</>;
}
