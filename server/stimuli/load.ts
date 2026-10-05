import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import highJson from "@/data/stimuli/high.json";
import lowJson from "@/data/stimuli/low.json";
import type { Risk } from "@/lib/types";

/**
 * 자극물 로더 (계획 01 §2 `server/stimuli/load.ts`).
 *
 * `data/stimuli/*.json` 을 읽는 **유일한** 모듈이다. ESLint 가 다른 곳에서의
 * import 를 막고, 이 파일은 server-only 이므로 클라이언트 번들에 들어가지 않는다
 * (CLAUDE.md 규칙 2).
 *
 * 자극물은 risk 수준을 키로 로드한다. 라운드 번호로 로드하지 않는다(규칙 4).
 */

const RATIONAL = /^-?\d+\/\d+$/;

const rationalString = z
  .string()
  .regex(RATIONAL, '유리수 문자열 형식이 아닙니다 (예: "7/24")');

const verdict = z.union([z.literal(0), z.literal(1)]);

const profileSchema = z
  .object({
    profile_id: z.string().regex(/^[LH]\d{2}$/),
    age: z.number().int().positive(),
    E: z.number().int().min(0).max(24),
    P: z.number().int().min(0).max(6),
    R: z.number().int().min(0).max(4),
    T: z.number().min(0),
    G: verdict,
    A: verdict,
    type: z.enum(["TP", "FP", "FN", "TN"]),
    fi: z
      .object({
        E: rationalString,
        P: rationalString,
        R: rationalString,
        T: rationalString,
      })
      .strict(),
    case_id: z.string().regex(/^(LC|HC)\d{2}$/),
    case_distance: rationalString,
    case_tie_count: z.number().int().min(1).max(16),
  })
  .strict();

const caseSchema = z
  .object({
    case_id: z.string().regex(/^(LC|HC)\d{2}$/),
    E: z.number().int().min(0).max(24),
    P: z.number().int().min(0).max(6),
    R: z.number().int().min(0).max(4),
    T: z.number().min(0),
    A: verdict,
  })
  .strict();

const stimuliSchema = z
  .object({
    stimulus_version: z.string().min(1),
    risk: z.enum(["low", "high"]),
    tau: z.number().positive(),
    rule_versions: z
      .object({
        G: z.string().min(1),
        A: z.string().min(1),
        FI: z.string().min(1),
        case: z.string().min(1),
      })
      .strict(),
    baseline_v0: rationalString,
    _note: z.string(),
    profiles: z.array(profileSchema).length(12),
    cases: z.array(caseSchema).length(16),
  })
  .strict();

export type Stimuli = z.infer<typeof stimuliSchema>;
export type StimulusProfile = Stimuli["profiles"][number];
export type StimulusCase = Stimuli["cases"][number];

const RAW: Record<Risk, unknown> = { low: lowJson, high: highJson };

/** JSON 키 순서·공백에 무관한 정규화 직렬화. 해시 입력으로만 쓴다. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
    .join(",")}}`;
}

interface LoadedStimuli {
  readonly stimuli: Stimuli;
  /** 정규화 JSON 의 SHA-256. 원자료와 함께 저장해 자극물 버전을 고정한다. */
  readonly hash: string;
}

const cache = new Map<Risk, LoadedStimuli>();

function load(risk: Risk): LoadedStimuli {
  const cached = cache.get(risk);
  if (cached) return cached;

  const parsed = stimuliSchema.safeParse(RAW[risk]);
  if (!parsed.success) {
    // 자극물이 깨졌으면 조용히 넘기지 않고 즉시 실패한다(docs/02).
    throw new Error(
      `자극물 검증 실패 (risk=${risk}): ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  const stimuli = parsed.data;
  if (stimuli.risk !== risk) {
    throw new Error(
      `자극물 risk 불일치: 파일은 ${stimuli.risk}, 요청은 ${risk}`,
    );
  }

  const hash = createHash("sha256").update(canonicalize(stimuli), "utf8").digest("hex");
  const loaded: LoadedStimuli = { stimuli, hash };
  cache.set(risk, loaded);
  return loaded;
}

/** 위험 맥락의 자극물. 검증을 통과한 값만 돌려준다. */
export function loadStimuli(risk: Risk): Stimuli {
  return load(risk).stimuli;
}

/** 자극물 파일의 정규화 SHA-256. 지표·응답과 함께 저장한다. */
export function stimuliHash(risk: Risk): string {
  return load(risk).hash;
}

/** 테스트와 해시 계산에서 함께 쓰는 정규화 함수. */
export { canonicalize };
