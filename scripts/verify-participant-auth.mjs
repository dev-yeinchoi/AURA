import { createHmac, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const app = process.env.AURA_TEST_BASE_URL ?? "http://localhost:3005";
if (!url || !secret) throw new Error("Supabase 서버 환경 변수가 필요합니다.");

const db = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const code = `PT-9${randomInt(100000, 999999)}`;
const pin = String(randomInt(0, 100_000_000)).padStart(8, "0");
const pinDigest = createHmac("sha256", secret)
  .update("aura-pin-v1\0")
  .update(pin)
  .digest("hex");
let participantId;
let browser;

async function expectStatus(response, status, label) {
  if (response.status !== status) {
    throw new Error(`${label}: expected ${status}, got ${response.status}`);
  }
}

try {
  const issued = await db.rpc("issue_participant", {
    p_code: code,
    p_phase: "pilot",
    p_pin_digest: pinDigest,
    p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (issued.error || !issued.data) throw issued.error ?? new Error("Test code not issued");
  participantId = issued.data;

  const wrong = await fetch(`${app}/api/participant/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, pin: pin === "00000000" ? "11111111" : "00000000" }),
  });
  await expectStatus(wrong, 401, "Wrong PIN");

  const login = await fetch(`${app}/api/participant/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, pin }),
  });
  await expectStatus(login, 200, "Correct PIN");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie?.startsWith("aura_session=")) throw new Error("Session cookie missing");

  const reused = await fetch(`${app}/api/participant/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, pin }),
  });
  await expectStatus(reused, 401, "Reused PIN");

  const session = await fetch(`${app}/api/participant/session`, {
    headers: { Cookie: cookie },
  });
  await expectStatus(session, 200, "Session lookup");
  const sessionBody = await session.json();
  if (sessionBody.participantCode !== code) throw new Error("Wrong participant returned");

  const newPin = pin === "99999999" ? "88888888" : "99999999";
  const newDigest = createHmac("sha256", secret)
    .update("aura-pin-v1\0").update(newPin).digest("hex");
  const reissued = await db.rpc("reissue_participant_pin", {
    p_code: code,
    p_pin_digest: newDigest,
    p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (reissued.error || !reissued.data) throw reissued.error ?? new Error("Reissue failed");
  const oldSession = await fetch(`${app}/api/participant/session`, {
    headers: { Cookie: cookie },
  });
  await expectStatus(oldSession, 401, "Session revoked on PIN reissue");

  const relogin = await fetch(`${app}/api/participant/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, pin: newPin }),
  });
  await expectStatus(relogin, 200, "New PIN login");
  const newCookie = relogin.headers.get("set-cookie")?.split(";")[0];
  if (!newCookie?.startsWith("aura_session=")) throw new Error("New session cookie missing");

  const logout = await fetch(`${app}/api/participant/logout`, {
    method: "POST", headers: { Cookie: newCookie },
  });
  await expectStatus(logout, 200, "Logout");
  const afterLogout = await fetch(`${app}/api/participant/session`, {
    headers: { Cookie: newCookie },
  });
  await expectStatus(afterLogout, 401, "Revoked session");

  const finalPin = "77777777";
  const finalDigest = createHmac("sha256", secret)
    .update("aura-pin-v1\0").update(finalPin).digest("hex");
  const resetAttempts = await db.rpc("reissue_participant_pin", {
    p_code: code,
    p_pin_digest: finalDigest,
    p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (resetAttempts.error || !resetAttempts.data) throw new Error("PIN reset failed");
  for (let attempt = 0; attempt < 5; attempt++) {
    const failure = await fetch(`${app}/api/participant/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, pin: "00000000" }),
    });
    await expectStatus(failure, 401, `Wrong attempt ${attempt + 1}`);
  }
  const locked = await fetch(`${app}/api/participant/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, pin: finalPin }),
  });
  await expectStatus(locked, 401, "Correct PIN after five failures");

  const browserPin = "66666666";
  const browserDigest = createHmac("sha256", secret)
    .update("aura-pin-v1\0").update(browserPin).digest("hex");
  const browserReset = await db.rpc("reissue_participant_pin", {
    p_code: code,
    p_pin_digest: browserDigest,
    p_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (browserReset.error || !browserReset.data) throw new Error("Browser PIN reset failed");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(app);
  await page.locator("#participant-id").fill(code);
  await page.locator("#participant-pin").fill(browserPin);
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page.getByText(`확인된 참가자 번호: ${code}`).waitFor();
  await page.getByRole("button", { name: "다른 참가자로 전환" }).click();
  await expect(page.locator("#participant-id")).toBeEnabled();

  console.log("Auth smoke test passed: browser entry, login, one-time use, session, reissue, logout, and five-attempt lock.");
} finally {
  if (browser) await browser.close();
  if (participantId) {
    const tables = ["participant_sessions", "participant_credentials", "participants"];
    for (const table of tables) {
      const column = table === "participant_sessions" || table === "participant_credentials"
        ? "participant_id" : "id";
      const { error } = await db.from(table).delete().eq(column, participantId);
      if (error) throw new Error(`Test cleanup failed in ${table}: ${error.message}`);
    }
  }
}
