import "server-only";

import type { Features, FeaturesOnly } from "@/lib/types";
import { A } from "@/server/rules/rules";
import {
  type Rational,
  add,
  mul,
  rational,
  sub,
} from "@/server/rules/rational";

/**
 * 정확한 interventional Shapley 기여도 (계획 01 §2 `shapley.ts`, docs/01 "fi").
 *
 * 기준 집합 B: E∈{3,9}, P∈{4,6}, R∈{2,4}, T∈{τ−1, τ+1} 의 직적곱 16개, 동일 가중치.
 * v(S) = (1/16) Σ_{b∈B} A(x_S ; b_{−S}) — S 에 든 특성은 대상 값, 나머지는 기준값.
 * v(∅) = 1/8.
 *
 * `scripts/generate_stimuli.py` 의 결과를 정확히 재현해야 하므로 부동소수점을
 * 쓰지 않고 bigint 유리수로 계산한다.
 */

export const FEATURE_KEYS = ["E", "P", "R", "T"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** 기준 집합 크기. 16개 조합, 동일 가중치. */
export const BASELINE_SIZE = 16;

/**
 * 기준 집합을 만든다. 순서는 E→P→R→T 오름차순 직적곱으로 고정한다.
 * 이 순서가 비교 사례 ID(LC01~LC16, HC01~HC16)의 번호와 직접 대응한다(docs/01).
 */
export function baselineSet(tau: number): Features[] {
  const out: Features[] = [];
  for (const E of [3, 9]) {
    for (const P of [4, 6]) {
      for (const R of [2, 4]) {
        for (const T of [tau - 1, tau + 1]) {
          out.push({ E, P, R, T });
        }
      }
    }
  }
  return out;
}

/** S 에 든 특성은 대상 값, 나머지는 기준값으로 섞은 특성 벡터. */
function mix(
  target: Features,
  baseline: Features,
  subset: ReadonlySet<FeatureKey>,
): Features {
  return {
    E: subset.has("E") ? target.E : baseline.E,
    P: subset.has("P") ? target.P : baseline.P,
    R: subset.has("R") ? target.R : baseline.R,
    T: subset.has("T") ? target.T : baseline.T,
  };
}

/**
 * 연합 가치 v(S). A 가 0/1 이므로 분자는 적격으로 판정된 기준 조합의 개수다.
 * 따라서 v(S) 는 분모 16 의 정확한 유리수다.
 */
export function coalitionValue(
  target: Features,
  subset: ReadonlySet<FeatureKey>,
  baseline: readonly Features[],
): Rational {
  let hits = 0;
  for (const b of baseline) {
    hits += A(mix(target, b, subset));
  }
  return rational(hits, baseline.length);
}

/** v(∅) — 대상과 무관한 기준선. docs/01 기준 집합에서 1/8 이 되어야 한다. */
export function baselineValue(baseline: readonly Features[]): Rational {
  return coalitionValue(
    // 공집합이므로 대상 값은 쓰이지 않는다.
    { E: 0, P: 0, R: 0, T: 0 },
    new Set<FeatureKey>(),
    baseline,
  );
}

function factorial(n: number): bigint {
  let acc = 1n;
  for (let i = 2n; i <= BigInt(n); i += 1n) acc *= i;
  return acc;
}

/** |S| = r 인 연합에 대한 Shapley 가중치 r!(n−r−1)!/n! (n = 4). */
function shapleyWeight(r: number, n: number): Rational {
  return rational(factorial(r) * factorial(n - r - 1), factorial(n));
}

/** others 의 모든 부분집합을 크기순으로 열거한다. */
function* subsetsOf(keys: readonly FeatureKey[]): Generator<FeatureKey[]> {
  for (let r = 0; r <= keys.length; r += 1) {
    yield* combinations(keys, r);
  }
}

function* combinations(
  keys: readonly FeatureKey[],
  r: number,
): Generator<FeatureKey[]> {
  if (r === 0) {
    yield [];
    return;
  }
  for (let i = 0; i <= keys.length - r; i += 1) {
    const head = keys[i];
    if (head === undefined) continue;
    for (const rest of combinations(keys.slice(i + 1), r - 1)) {
      yield [head, ...rest];
    }
  }
}

/**
 * 네 특성의 정확한 Shapley 기여도.
 * A 가 T 를 쓰지 않으므로 φT 는 항상 0 이어야 한다(docs/01).
 */
export function shapleyValues<T extends Features>(
  target: FeaturesOnly<T>,
  tau: number,
): Record<FeatureKey, Rational> {
  // 내부 계산은 평문 Features 로 좁혀서 쓴다.
  const x: Features = target;
  const baseline = baselineSet(tau);
  const n = FEATURE_KEYS.length;
  const out = {} as Record<FeatureKey, Rational>;

  for (const key of FEATURE_KEYS) {
    const others = FEATURE_KEYS.filter((k) => k !== key);
    let acc = rational(0);
    for (const subset of subsetsOf(others)) {
      const withoutKey = new Set<FeatureKey>(subset);
      const withKey = new Set<FeatureKey>([...subset, key]);
      const marginal = sub(
        coalitionValue(x, withKey, baseline),
        coalitionValue(x, withoutKey, baseline),
      );
      acc = add(acc, mul(shapleyWeight(subset.length, n), marginal));
    }
    out[key] = acc;
  }

  return out;
}
