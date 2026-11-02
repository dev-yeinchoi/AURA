import { createHash, createHmac, randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const baseUrl = process.env.AURA_TEST_BASE_URL ?? "http://localhost:3001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Supabase 환경 변수가 필요합니다.");
if (!new URL(baseUrl).hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
  throw new Error("온라인 동의 검증은 로컬 앱에서만 실행합니다.");
}
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const documents = await Promise.all([
  ["information", "participant-information.pdf"],
  ["consent", "written-consent.pdf"],
].map(async ([kind, name]) => {
  const bytes = await readFile(join(process.cwd(), "data/private/documents", name));
  return { kind, bytes, sha: createHash("sha256").update(bytes).digest("hex") };
}));
const version = `sha256-${createHash("sha256").update(documents.map(d => d.sha).join(":"))
  .digest("hex").slice(0, 16)}`;
const { data: active, error: activeError } = await db.from("study_documents")
  .select("version").eq("active", true).maybeSingle();
if (activeError) throw activeError;
if (active && active.version !== version) {
  throw new Error("활성 운영 문서가 로컬 PDF와 다릅니다. 검증 중에 운영 문서를 교체하지 않습니다.");
}
const ids = [];
let activated = false;
let browser;

async function issue() {
  const code = `PT-9${randomInt(100000, 999999)}`;
  const pin = String(randomInt(0, 100_000_000)).padStart(8, "0");
  const digest = createHmac("sha256", secret).update("aura-pin-v1\0").update(pin).digest("hex");
  const { data: id, error } = await db.rpc("issue_participant", {
    p_code: code, p_phase: "pilot", p_pin_digest: digest,
    p_expires_at: new Date(Date.now() + 900_000).toISOString(),
  });
  if (error || !id) throw error ?? new Error("Test participant issue failed");
  ids.push(id);
  const login = await fetch(`${baseUrl}/api/participant/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, pin }),
  });
  if (!login.ok) throw new Error(`Login failed: ${login.status}`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Session cookie missing");
  return { id, cookie };
}

async function post(path, cookie, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  return response;
}

try {
  if (!active) {
    for (const document of documents) {
      const path = `${version}/${document.kind}.pdf`;
      const { error } = await db.storage.from("study-documents").upload(path, document.bytes,
        { contentType: "application/pdf", upsert: false });
      if (error && !error.message.toLowerCase().includes("already exists")) throw error;
    }
    const { error: activationError } = await db.rpc("activate_study_documents", {
      p_version: version,
      p_information_path: `${version}/information.pdf`,
      p_consent_path: `${version}/consent.pdf`,
      p_information_sha256: documents[0].sha,
      p_consent_sha256: documents[1].sha,
    });
    if (activationError) throw activationError;
    activated = true;
  }

  const accepted = await issue();
  const study = await fetch(`${baseUrl}/study`, { headers: { Cookie: accepted.cookie } });
  if (!study.ok || !(await study.text()).includes("연구 참여 동의")) {
    throw new Error("Online consent screen missing");
  }
  const pdf = await fetch(`${baseUrl}/api/study-document/information?version=${version}`,
    { headers: { Cookie: accepted.cookie } });
  if (!pdf.ok || createHash("sha256").update(Buffer.from(await pdf.arrayBuffer())).digest("hex") !== documents[0].sha) {
    throw new Error("Private PDF delivery failed");
  }
  const before = await post("/api/pilot/event", accepted.cookie, { stage: "demographics", round: null });
  if (before.status !== 403) throw new Error(`Study opened before consent: ${before.status}`);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([{
    name: "aura_session", value: accepted.cookie.split("=")[1], url: baseUrl,
  }]);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/study`);
  await page.getByRole("button", { name: "동의하고 참여" }).click();
  await page.getByRole("heading", { name: "AURA 파일럿" }).waitFor();
  await browser.close();
  browser = undefined;
  const after = await post("/api/pilot/event", accepted.cookie, { stage: "demographics", round: null });
  if (!after.ok) throw new Error(`Study stayed closed after consent: ${after.status}`);

  const declined = await issue();
  const decline = await post("/api/pilot/consent", declined.cookie,
    { decision: "declined", documentVersion: version, informationMs: 600, consentMs: 500 });
  if (!decline.ok) throw new Error(`Consent decline failed: ${decline.status}`);
  const refused = await post("/api/pilot/event", declined.cookie, { stage: "demographics", round: null });
  if (refused.status !== 403) throw new Error(`Declined participant opened study: ${refused.status}`);
  const { data: records, error: recordsError } = await db.from("consent_records")
    .select("participant_id,decision,document_version,information_sha256,consent_sha256")
    .in("participant_id", ids);
  if (recordsError || records?.length !== 2 ||
      !records.some(r => r.decision === "accepted" && r.document_version === version) ||
      !records.some(r => r.decision === "declined" && r.document_version === version)) {
    throw recordsError ?? new Error("Consent records missing");
  }
  process.stdout.write("Online consent passed: private PDFs, accept/decline, versioned records, study gate.\n");
} finally {
  if (browser) await browser.close();
  if (activated) {
    const { error } = await db.from("study_documents").update({ active: false }).eq("version", version);
    if (error) throw error;
  }
  for (const id of ids) {
    for (const table of ["survey_answers", "decisions", "page_visits", "consent_records",
      "rounds", "assignments", "participant_sessions", "participant_credentials", "participants"]) {
      const { error } = await db.from(table).delete().eq(table === "participants" ? "id" : "participant_id", id);
      if (error) throw new Error(`Synthetic cleanup failed in ${table}: ${error.message}`);
    }
  }
}
