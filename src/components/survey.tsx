import type {Question} from "@/content/surveys";
export function Survey({questions,answers,onAnswer,vertical=false}:{questions:Question[];answers:Record<string,number|string>;onAnswer:(id:string,value:number)=>void;vertical?:boolean}){
  return <>{questions.map(q=><fieldset className="question" key={q.id}><legend>{q.text}</legend><div className={`options ${vertical||q.options.length===7?"vertical-labels":""}`} style={{gridTemplateColumns:`repeat(${q.options.length},minmax(0,1fr))`}}>{q.options.map((label,i)=><label key={label}><input type="radio" name={q.id} value={i+1} checked={answers[q.id]===i+1} onChange={()=>onAnswer(q.id,i+1)}/><span>{label}</span></label>)}</div></fieldset>)}</>;
}
