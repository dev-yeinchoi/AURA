"use client";
import {useState} from "react";
export default function Entry(){
  const [id,setId]=useState("");const [message,setMessage]=useState("");
  return <main className="entry"><form className="panel entry-card" onSubmit={e=>{e.preventDefault();setMessage(id.trim()?"아직 연구 참여가 시작되지 않았습니다. 진행자에게 문의해 주세요.":"참가자 번호를 입력해 주세요.");}}>
    <p className="eyebrow">STEP 01</p><h1>AURA 연구 참여 안내</h1><p className="muted">참가자 번호를 입력하면 등록된 정보를 확인할 수 있습니다.<br/>참가자 정보를 확인하고 시작해 주세요.</p><hr/>
    <label htmlFor="participant-id">참가자 번호</label><div className="entry-input"><input id="participant-id" value={id} onChange={e=>setId(e.target.value)} placeholder="예: P-001" autoComplete="off" maxLength={40}/><button>확인</button></div>
    {message && <p role="status" className="muted">{message}</p>}
  </form><button className="start" disabled>시작하기</button>{process.env.NODE_ENV==="development"&&<a className="preview-link" href="/preview">개발용 미리보기 열기</a>}</main>;
}
