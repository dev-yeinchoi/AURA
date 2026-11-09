"use client";

import {useEffect,useState} from "react";
import {demoAccounts} from "@/lib/demo-accounts";

type Identity={participantCode:string;maskedName:string;maskedPhone:string};
export default function Entry(){
  const [code,setCode]=useState("");
  const [last4,setLast4]=useState("");
  const [identity,setIdentity]=useState<Identity|null>(null);
  const [verifiedCode,setVerifiedCode]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const demo=demoAccounts[code.trim().toUpperCase()];

  useEffect(()=>{let active=true;fetch("/api/participant/session",{cache:"no-store"}).then(async r=>r.ok?r.json():null).then(s=>{if(active&&s?.authenticated){setVerifiedCode(s.participantCode);setCode(s.participantCode);}}).catch(()=>{});return()=>{active=false;};},[]);

  async function verify(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setMessage("");
    if(demo){location.assign(`/demo?account=${encodeURIComponent(code.trim().toUpperCase())}`);return;}
    if(!/^(PT|MT)-\d{3,}$/i.test(code.trim())||!/^\d{4}$/.test(last4)){setMessage("참가자 번호와 전화번호 뒤 4자리를 입력해 주세요.");return;}
    setBusy(true);
    try{
      const response=await fetch("/api/participant/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,phoneLast4:last4})});
      const result=await response.json();
      if(!response.ok){setMessage(result.error??"참가자 확인에 실패했습니다.");return;}
      setIdentity(result);setLast4("");setMessage("");
    }catch{setMessage("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");}finally{setBusy(false);}
  }
  async function confirmIdentity(){
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/participant/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmed:true})});
      const result=await response.json();
      if(!response.ok){setMessage(result.error??"본인 확인을 완료하지 못했습니다.");setIdentity(null);return;}
      setVerifiedCode(result.participantCode);setCode(result.participantCode);setIdentity(null);
    }catch{setMessage("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");}finally{setBusy(false);}
  }
  async function signOut(){
    setBusy(true);
    try{const response=await fetch("/api/participant/logout",{method:"POST"});if(!response.ok)throw new Error();setVerifiedCode("");setIdentity(null);setCode("");setLast4("");setMessage("");}
    catch{setMessage("로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.");}finally{setBusy(false);}
  }
  return <main className="entry">
    <form className="panel entry-card" onSubmit={verify}>
      <p className="eyebrow">STEP 01</p><h1>AURA 연구 참여 안내</h1>
      <p className="muted">전달받은 참가자 번호와 휴대전화 번호 뒤 4자리를 입력해 주세요. DM-001~DM-006은 데모 계정입니다.</p><hr/>
      <label htmlFor="participant-id">참가자 번호</label>
      <div className="entry-input"><input id="participant-id" value={code} onChange={e=>{setCode(e.target.value);setIdentity(null);}} placeholder="예: PT-001 또는 DM-001" autoComplete="off" maxLength={40} disabled={Boolean(verifiedCode)}/></div>
      {!demo&&!verifiedCode&&!identity&&<><label htmlFor="participant-last4">휴대전화 번호 뒤 4자리</label><div className="entry-input"><input id="participant-last4" value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,""))} placeholder="뒤 4자리" type="text" inputMode="numeric" autoComplete="off" maxLength={4}/><button type="submit" disabled={busy}>{busy?"확인 중":"정보 확인"}</button></div></>}
      {demo&&!verifiedCode&&<button type="submit" disabled={busy}>{demo.group} 데모 열기</button>}
      {identity&&<div className="identity-confirm" role="status"><h2>본인 정보 확인</h2><p>이름: <strong>{identity.maskedName}</strong></p><p>휴대전화: <strong>{identity.maskedPhone}</strong></p><button type="button" disabled={busy} onClick={confirmIdentity}>확인, 본인 정보가 맞습니다</button><button type="button" className="secondary" disabled={busy} onClick={()=>setIdentity(null)}>다시 입력</button></div>}
      {verifiedCode&&<><p role="status" className="muted">확인된 참가자 번호: {verifiedCode}</p><button type="button" className="secondary" disabled={busy} onClick={signOut}>다른 참가자로 전환</button></>}
      {message&&<p role="alert" className="error">{message}</p>}
    </form>
    <button className="start" disabled={!verifiedCode||busy} onClick={()=>location.assign("/study")}>실험 시작</button>
    <a className="preview-link" href="/demo">화면 데모 보기</a>
    {process.env.NODE_ENV==="development"&&<a className="preview-link" href="/preview">개발용 미리보기 열기</a>}
  </main>;
}
