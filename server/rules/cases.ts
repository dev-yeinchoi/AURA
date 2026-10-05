import "server-only";

import type { Features, FeaturesOnly, Risk } from "@/lib/types";
import { type Verdict, A } from "@/server/rules/rules";
import { type Rational, add, compare, div, rational } from "@/server/rules/rational";
import { baselineSet } from "@/server/rules/shapley";

/**
 * 가상 비교 사례 (계획 01 §2 `cases.ts`, docs/01 "fi_case").
 *
 * 사례 집합은 Shapley 기준 집합과 같은 16개 조합이며 ID 는 E→P→R→T 오름차순으로
 * LC01~LC16 / HC01~HC16 이다. 사례에는 A 판정만 붙인다 — G 나 실제 성과는 쓰지 않는다.
 */

export interface ComparisonCase extends Features {
  readonly case_id: string;
  /** 사례에 A 를 적용한 판정. G 는 사례에 붙이지 않는다. */
  readonly A: Verdict;
}

export interface NearestCase {
  readonly case: ComparisonCase;
  readonly distance: Rational;
  /** 최소 거리를 공유하는 사례 수. 1 이면 동률 없음. */
  readonly tieCount: number;
}

function casePrefix(risk: Risk): "LC" | "HC" {
  return risk === "low" ? "LC" : "HC";
}

/** 16개 사례를 만든다. 순서·ID 는 기준 집합 순서에 고정된다. */
export function buildCases(risk: Risk, tau: number): ComparisonCase[] {
  const prefix = casePrefix(risk);
  return baselineSet(tau).map((features, index) => ({
    ...features,
    case_id: `${prefix}${String(index + 1).padStart(2, "0")}`,
    A: A(features),
  }));
}

/**
 * d(x, c) = [ |E−Ec|/24 + |P−Pc|/6 + |R−Rc|/4 ] / 3
 *
 * T 와 나이는 쓰지 않는다(docs/01). 정확한 유리수로 계산한다.
 */
export function caseDistance<T extends Features>(
  target: FeaturesOnly<T>,
  candidate: Features,
): Rational {
  const terms = [
    rational(Math.abs(target.E - candidate.E), 24),
    rational(Math.abs(target.P - candidate.P), 6),
    rational(Math.abs(target.R - candidate.R), 4),
  ];
  return div(terms.reduce(add, rational(0)), rational(3));
}

/**
 * 거리 최소 사례. 동률이면 ID 가 작은 쪽을 고른다.
 * ID 는 0 패딩된 고정 폭이므로 문자열 비교가 번호 순서와 같다.
 */
export function nearestCase<T extends Features>(
  target: FeaturesOnly<T>,
  cases: readonly ComparisonCase[],
): NearestCase {
  const first = cases[0];
  if (first === undefined) {
    throw new RangeError("비교 사례 집합이 비어 있습니다.");
  }

  // 내부 계산은 평문 Features 로 좁혀서 쓴다.
  const x: Features = target;
  let best = first;
  let bestDistance = caseDistance(x, first);

  for (const candidate of cases.slice(1)) {
    const distance = caseDistance(x, candidate);
    const byDistance = compare(distance, bestDistance);
    if (byDistance < 0 || (byDistance === 0 && candidate.case_id < best.case_id)) {
      best = candidate;
      bestDistance = distance;
    }
  }

  let tieCount = 0;
  for (const candidate of cases) {
    if (compare(caseDistance(x, candidate), bestDistance) === 0) {
      tieCount += 1;
    }
  }

  return { case: best, distance: bestDistance, tieCount };
}
