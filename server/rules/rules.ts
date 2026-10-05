import "server-only";

import type { ConfusionType, Features, FeaturesOnly } from "@/lib/types";

/**
 * 판정 규칙 (계획 01 §2 `rules.ts`, docs/02 "판정 규칙").
 *
 * G = 연구용 적격 기준(정답), A = AURA 추천 규칙.
 * 둘 다 나이를 입력으로 받지 않는다 — `Features` 에 age 가 없다(CLAUDE.md 규칙 5).
 * G 와 유형(TP/FP/FN/TN)은 클라이언트로 절대 전송하지 않는다(규칙 2).
 */

/** 이진 판정 결과. 1 = 적격, 0 = 부적격. */
export type Verdict = 0 | 1;

/**
 * G = 1 ⇔ (T ≥ τ) ∧ (R ≥ 3) ∧ (P ≥ 5) ∧ [(E ≥ 6) ∨ (P = 6)]
 *
 * τ 는 위험 맥락에서 온다(Low 2, High 4). 자극물에서 읽어 넘긴다.
 */
export function G<T extends Features>(
  { E, P, R, T }: FeaturesOnly<T>,
  tau: number,
): Verdict {
  return T >= tau && R >= 3 && P >= 5 && (E >= 6 || P === 6) ? 1 : 0;
}

/**
 * A = 1 ⇔ (E ≥ 6) ∧ (P ≥ 5) ∧ (R ≥ 3)
 *
 * T 를 쓰지 않고, P=6 에 의한 경험 보완 경로도 적용하지 않는다(docs/02).
 * T 를 구조 분해에서 아예 빼서 실수로 참조할 수 없게 둔다.
 */
export function A<T extends Features>({ E, P, R }: FeaturesOnly<T>): Verdict {
  return E >= 6 && P >= 5 && R >= 3 ? 1 : 0;
}

/** 혼동행렬 유형. 연구자용 — 클라이언트로 보내지 않는다. */
export function confusionType(g: Verdict, a: Verdict): ConfusionType {
  if (g === 1) return a === 1 ? "TP" : "FN";
  return a === 1 ? "FP" : "TN";
}
