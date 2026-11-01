"use client";

import { useEffect, useState } from "react";

export default function Entry() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/participant/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((session) => {
        if (active && session?.authenticated) {
          setVerifiedCode(session.participantCode);
          setCode(session.participantCode);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!code.trim() || !/^\d{8}$/.test(pin)) {
      setMessage("참가자 번호와 8자리 PIN을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/participant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pin }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "참가자 확인에 실패했습니다.");
        return;
      }
      setVerifiedCode(result.participantCode);
      setCode(result.participantCode);
      setPin("");
      setMessage("참가자 번호가 확인되었습니다.");
    } catch {
      setMessage("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const response = await fetch("/api/participant/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      setVerifiedCode("");
      setCode("");
      setPin("");
      setMessage("");
    } catch {
      setMessage("로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="entry">
    <form className="panel entry-card" onSubmit={verify}>
      <p className="eyebrow">STEP 01</p>
      <h1>AURA 연구 참여 안내</h1>
      <p className="muted">진행자에게 받은 참가자 번호와 일회용 PIN을 입력해 주세요.</p>
      <hr />
      <label htmlFor="participant-id">참가자 번호</label>
      <div className="entry-input"><input id="participant-id" value={code} onChange={(event) => setCode(event.target.value)}
        placeholder="예: PT-001 또는 MT-001" autoComplete="off" maxLength={40}
        disabled={Boolean(verifiedCode)} /></div>
      <label htmlFor="participant-pin">일회용 PIN</label>
      <div className="entry-input"><input id="participant-pin" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
        placeholder="8자리 숫자" type="text" inputMode="numeric" autoComplete="one-time-code"
        maxLength={8} disabled={Boolean(verifiedCode)} />
        <button type="submit" disabled={busy || Boolean(verifiedCode)}>{busy ? "확인 중" : "확인"}</button></div>
      {verifiedCode && <p role="status" className="muted">확인된 참가자 번호: {verifiedCode}</p>}
      {verifiedCode && <button type="button" className="secondary" disabled={busy} onClick={signOut}>다른 참가자로 전환</button>}
      {message && <p role="status" className="muted">{message}</p>}
    </form>
    <button className="start" disabled={!verifiedCode || busy} onClick={() => location.assign("/study")}>시작하기</button>
    {process.env.NODE_ENV === "development" && <a className="preview-link" href="/preview">개발용 미리보기 열기</a>}
  </main>;
}
