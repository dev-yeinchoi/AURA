"use client";

import { useState } from "react";

type Props = { documentVersion: string };

export default function OnlineConsent({ documentVersion }: Props) {
  const [step, setStep] = useState<"information" | "consent">("information");
  const [enteredAt, setEnteredAt] = useState(() => Date.now());
  const [informationMs, setInformationMs] = useState(0);
  const [previousConsentMs, setPreviousConsentMs] = useState(0);
  const [decision, setDecision] = useState<"accepted" | "declined" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [declined, setDeclined] = useState(false);

  if (declined) return <main className="workspace panel document"><h1>참여가 종료되었습니다.</h1><p>참여하지 않기로 선택하셨습니다.</p></main>;

  const documentUrl = `/api/study-document/${step}?version=${encodeURIComponent(documentVersion)}`;
  const next = () => {
    setInformationMs(value => Math.min(14_400_000, value + Date.now() - enteredAt));
    setEnteredAt(Date.now());
    setStep("consent");
    setError("");
  };
  const submit = async () => {
    if (!decision || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision, documentVersion, informationMs,
          consentMs: Math.min(14_400_000, previousConsentMs + Date.now() - enteredAt),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "동의를 저장하지 못했습니다.");
      if (decision === "declined") setDeclined(true);
      else window.location.assign("/study");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "동의를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="workspace online-consent-page">
    <header className="screen-heading">
      <p className="eyebrow">{step === "information" ? "STEP 01" : "STEP 02"}</p>
      <h1>{step === "information" ? "연구대상자를 위한 설명문" : "연구 참여 동의서"}</h1>
      <p className="muted">{step === "information" ? "설명문을 읽고 참여 절차를 확인해 주세요." : "동의서를 읽고 참여 여부를 선택해 주세요."}</p>
    </header>
    <section className="panel document online-consent-document">
      <iframe className="document-frame" title={step === "information" ? "연구대상자 설명문" : "연구 참여 동의서"} src={documentUrl} />
      <a href={documentUrl} target="_blank" rel="noreferrer">PDF를 새 창에서 열기</a>
    </section>
    {step === "consent" && <fieldset className="panel consent">
      <legend>참여 의사 선택</legend>
      <p>설명문과 동의서를 확인한 뒤 본인의 의사를 선택해 주세요.</p>
      <label><input type="radio" name="online-consent" checked={decision === "accepted"} onChange={() => setDecision("accepted")} />설명문과 동의서를 확인했으며, 연구 참여에 동의합니다.</label>
      <label><input type="radio" name="online-consent" checked={decision === "declined"} onChange={() => setDecision("declined")} />연구 참여에 동의하지 않습니다.</label>
    </fieldset>}
    {error && <p className="error" role="alert">{error}</p>}
    <nav className="navigation" aria-label="동의 절차">
      {step === "consent" && <button className="secondary" disabled={saving} onClick={() => { setPreviousConsentMs(value => Math.min(14_400_000, value + Date.now() - enteredAt)); setStep("information"); setEnteredAt(Date.now()); }}>설명문 다시 보기</button>}
      {step === "information"
        ? <button onClick={next}>동의서 확인</button>
        : <button disabled={!decision || saving} onClick={submit}>{saving ? "저장 중…" : decision === "declined" ? "참여 거절" : "동의하고 참여"}</button>}
    </nav>
  </main>;
}
