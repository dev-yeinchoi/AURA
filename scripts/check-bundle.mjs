#!/usr/bin/env node
/**
 * 클라이언트 번들 유출 검사 (CLAUDE.md 실험 무결성 규칙 2, 계획 01 §1).
 *
 * `.next/static` 과 서버가 클라이언트로 내려보내는 RSC 페이로드에
 * 정답(G)·혼동행렬 유형·자극물 메타데이터가 들어갔는지 문자열로 검사한다.
 * 하나라도 발견되면 0이 아닌 코드로 종료한다.
 *
 * 사용: pnpm build && pnpm check:bundle
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGETS = [".next/static", ".next/server/app"];

/**
 * 금지 문자열. 번들은 압축되므로 공백 없는 형태와 공백 있는 형태를 함께 본다.
 * profile_id(L01…)·age·E/P/R/T 는 화면에 정상 노출되는 값이므로 넣지 않는다.
 */
const FORBIDDEN = [
  // 정답 G 와 혼동행렬 유형은 절대 클라이언트로 가지 않는다.
  '"type":"TP"',
  '"type": "TP"',
  '"type":"FP"',
  '"type": "FP"',
  '"type":"FN"',
  '"type": "FN"',
  '"type":"TN"',
  '"type": "TN"',
  // 자극물 JSON 고유 키 — 번들에 있으면 파일이 통째로 들어간 것이다.
  "case_tie_count",
  "case_distance",
  "baseline_v0",
  "stimulus_version",
  "rule_versions",
  "SERVER-ONLY",
];

/** 서버 번들에는 있어도 되는 경로(= 클라이언트로 전송되지 않는 코드)는 없다고 본다. */
async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

const hits = [];
let scanned = 0;
let missing = 0;

for (const target of TARGETS) {
  const abs = join(ROOT, target);
  try {
    await stat(abs);
  } catch {
    missing += 1;
    console.error(`검사 대상 없음: ${target} — 먼저 pnpm build 를 실행하세요.`);
    continue;
  }
  for await (const file of walk(abs)) {
    if (!/\.(js|mjs|cjs|json|txt|rsc|html|css|map)$/.test(file)) continue;
    scanned += 1;
    const text = await readFile(file, "utf8");
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) {
        hits.push({ file: relative(ROOT, file), needle });
      }
    }
  }
}

if (missing === TARGETS.length) {
  process.exit(1);
}

if (hits.length > 0) {
  console.error(`\n유출 발견 — ${hits.length}건`);
  for (const { file, needle } of hits) {
    console.error(`  ${file}: ${needle}`);
  }
  console.error(
    "\nserver-only 모듈이 클라이언트 컴포넌트에서 import되었는지 확인하세요.",
  );
  process.exit(1);
}

console.log(`ok: ${scanned}개 파일 검사, 유출 없음 (금지 문자열 ${FORBIDDEN.length}종)`);
