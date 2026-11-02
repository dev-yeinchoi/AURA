"use client";

import { useState } from "react";

type Props = { documentVersion: string };

export default function OnlineConsent({ documentVersion }: Props) {
  const [enteredAt] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [declined, setDeclined] = useState(false);

  if (declined) return <main className="workspace panel document"><h1>참여가 종료되었습니다.</h1><p>참여하지 않기로 선택하셨습니다.</p></main>;

  const documentUrl = (kind: "information" | "consent") =>
    `/api/study-document/${kind}?version=${encodeURIComponent(documentVersion)}`;

  const submit = async (decision: "accepted" | "declined") => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision, documentVersion, informationMs: 0,
          consentMs: Math.min(14_400_000, Date.now() - enteredAt),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "선택을 저장하지 못했습니다.");
      if (decision === "declined") setDeclined(true);
      else window.location.assign("/study");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "선택을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="workspace panel document consent-entry">
    <p className="eyebrow">STEP 01</p>
    <h1>연구 참여 동의</h1>
    <p>연구 목적, 진행 절차, 개인정보 처리와 참여 중단 방법은 아래 문서에서 확인할 수 있습니다.</p>
    <div className="consent-links">
      <a href={documentUrl("information")} target="_blank" rel="noreferrer">연구대상자를 위한 설명문 보기</a>
      <a href={documentUrl("consent")} target="_blank" rel="noreferrer">연구 참여 동의서 보기</a>
    </div>
    <p className="muted">참여는 자발적이며, 동의하지 않아도 불이익이 없습니다. 궁금한 점은 진행자에게 문의할 수 있습니다.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="consent-actions">
      <button disabled={saving} onClick={() => void submit("accepted")}>{saving ? "저장 중…" : "동의하고 참여"}</button>
      <button className="secondary" disabled={saving} onClick={() => void submit("declined")}>참여하지 않음</button>
    </div>
  </main>;
}
