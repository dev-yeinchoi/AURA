import "server-only";

import type {
  AuraProfileView,
  AuthorityCueView,
  ComparisonCaseView,
  ContributionView,
  ExplanationView,
} from "@/lib/display";
import type { Authority, Explanation, Features, Risk } from "@/lib/types";
import { authorityCueContent } from "@/server/content/manipulations";
import { buildCases, nearestCase } from "@/server/rules/cases";
import { parseRational, toNumber, toRationalString } from "@/server/rules/rational";
import { FEATURE_KEYS, shapleyValues } from "@/server/rules/shapley";
import { shuffle } from "@/server/rules/order";
import { loadStimuli } from "@/server/stimuli/load";

/**
 * AI 제시 패널 페이로드 조립 (docs/01, docs/07 S9·S10).
 *
 * **노출 통제 (CLAUDE.md 규칙 2)**
 * 자극물에는 G 와 혼동행렬 유형이 들어 있지만, 여기서 만드는 어떤 값에도 넣지
 * 않는다. 화면 컴포넌트는 이 모듈이 돌려준 값만 받는다. A·기여도·사례는 해당
 * 라운드 초기 판단 잠금이 성공한 뒤에만 이 함수를 호출해야 한다.
 */

const FORBIDDEN_KEYS = ["G", "type"] as const;

const featuresOf = (p: { E: number; P: number; R: number; T: number }): Features => ({
  E: p.E,
  P: p.P,
  R: p.R,
  T: p.T,
});

/** 기여도를 소수 셋째 자리 + 부호로 표시한다(docs/01). */
function toContributions(target: Features, tau: number): ContributionView[] {
  const phi = shapleyValues(target, tau);
  return FEATURE_KEYS.map((key) => {
    const exact = toRationalString(phi[key]);
    const value = toNumber(phi[key]);
    // 0 은 부호를 붙이지 않는다. 양수는 +, 음수는 − (U+2212) 로 표시한다.
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    const display = `${sign}${Math.abs(value).toFixed(3)}`;
    return { key, value, display, exact };
  });
}

function toComparisonCase(target: Features, risk: Risk, tau: number): ComparisonCaseView {
  const nearest = nearestCase(target, buildCases(risk, tau));
  return {
    caseId: nearest.case.case_id,
    E: nearest.case.E,
    P: nearest.case.P,
    R: nearest.case.R,
    T: nearest.case.T,
    verdict: nearest.case.A,
  };
}

/**
 * 배정된 설명 유형에 맞는 표시값. 반환값에 조건명은 남지 않는다.
 *
 * docs/01: fi 와 fi_case 의 기여도 표시는 **완전히 동일**하다. 사례만 추가된다.
 */
export function explanationView(
  explanation: Explanation,
  target: Features,
  risk: Risk,
  tau: number,
): ExplanationView {
  if (explanation === "none") {
    return { contributions: null, comparisonCase: null };
  }
  const contributions = toContributions(target, tau);
  if (explanation === "fi") {
    return { contributions, comparisonCase: null };
  }
  return { contributions, comparisonCase: toComparisonCase(target, risk, tau) };
}

export function authorityCueView(authority: Authority): AuthorityCueView {
  return authorityCueContent(authority);
}

/**
 * 해당 라운드의 12명 전원 — 표시 순서는 시드로 고정한다(docs/02, docs/06).
 * G 와 유형은 빼고 A 만 담는다.
 */
export function auraProfileViews(risk: Risk, orderSeed: string): AuraProfileView[] {
  const stimuli = loadStimuli(risk);
  const views: AuraProfileView[] = stimuli.profiles.map((p) => ({
    profileId: p.profile_id,
    age: p.age,
    E: p.E,
    P: p.P,
    R: p.R,
    T: p.T,
    auraVerdict: p.A,
  }));
  return shuffle(views, orderSeed);
}

/** 맥락의 τ. 자극물에서 읽는다 — 화면에서 추측하지 않는다. */
export function tauOf(risk: Risk): number {
  return loadStimuli(risk).tau;
}

/** 프로필 특성만 추려 낸다. age 는 계산 함수에 넘기지 않는다(규칙 5). */
export function featuresOfProfile(view: AuraProfileView): Features {
  return featuresOf(view);
}

/**
 * 표시용 페이로드에 G·유형이 섞이지 않았는지 재귀적으로 확인한다.
 * 테스트와 개발 모드에서 쓰는 안전망이다.
 */
export function assertNoLeak(value: unknown, path = "payload"): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoLeak(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if ((FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      throw new Error(`표시용 페이로드에 금지된 키가 있습니다: ${path}.${key}`);
    }
    if (typeof child === "string" && /^(TP|FP|FN|TN)$/.test(child)) {
      throw new Error(`표시용 페이로드에 혼동행렬 유형이 있습니다: ${path}.${key}`);
    }
    assertNoLeak(child, `${path}.${key}`);
  }
}

/** 유리수 문자열을 표시용 근사값으로 바꾼다. 화면에서만 쓴다. */
export function rationalToNumber(text: string): number {
  return toNumber(parseRational(text));
}
