#!/usr/bin/env node
/**
 * IRB 서류용 화면 캡처 (연구자용).
 *
 * 조건 때문에 달라지는 화면 S9·S10 을 6조건 × 2맥락으로 캡처한다.
 * 기준 해상도 1280×720, 연구자 전환 막대 없음(capture=1).
 *
 * 사용:
 *   1) 다른 터미널에서  pnpm dev
 *   2) pnpm capture:irb            → captures/ 에 PNG 저장
 *      pnpm capture:irb --out docs/irb-shots
 *
 * Chrome 경로는 CHROME_PATH 환경변수로 바꿀 수 있다.
 */
import { execFile } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";

const argOut = process.argv.indexOf("--out");
const OUT = resolve(argOut > -1 ? (process.argv[argOut + 1] ?? "captures") : "captures");

const SCREENS = ["s9", "s10"];
const AUTHORITIES = ["low", "high"];
const EXPLANATIONS = ["none", "fi", "fi_case"];
const RISKS = ["low", "high"];

try {
  await access(CHROME);
} catch {
  console.error(`Chrome 을 찾을 수 없습니다: ${CHROME}`);
  console.error("CHROME_PATH 환경변수로 경로를 지정하세요.");
  process.exit(1);
}

try {
  const res = await fetch(`${BASE}/preview`);
  if (!res.ok) throw new Error(String(res.status));
} catch {
  console.error(`미리보기 서버에 접속할 수 없습니다: ${BASE}/preview`);
  console.error("다른 터미널에서 pnpm dev 를 먼저 실행하세요.");
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

let count = 0;
for (const screen of SCREENS) {
  for (const risk of RISKS) {
    for (const authority of AUTHORITIES) {
      for (const explanation of EXPLANATIONS) {
        const name = `${screen}_risk-${risk}_auth-${authority}_exp-${explanation}.png`;
        const url =
          `${BASE}/preview/${screen}?authority=${authority}` +
          `&explanation=${explanation}&risk=${risk}&capture=1`;
        await run(CHROME, [
          "--headless",
          "--disable-gpu",
          "--hide-scrollbars",
          "--force-device-scale-factor=1",
          "--window-size=1280,720",
          `--screenshot=${join(OUT, name)}`,
          url,
        ]);
        count += 1;
        console.log(`  ${name}`);
      }
    }
  }
}

console.log(`\nok: ${count}장 저장 → ${OUT}`);
console.log(
  "참고: S10 은 현재 명세상 권위 단서를 표시하지 않으므로 authority low/high 캡처가 동일합니다.",
);
