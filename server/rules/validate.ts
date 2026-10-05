import "server-only";

import type { Features } from "@/lib/types";

/**
 * 특성 범위 검증 (계획 01 §2 `validate.ts`).
 *
 * docs/02: E 0~24, P 0~6, R 0~4, T ≥ 0.
 * "경계값·범위 오류 검증 실패 시 배포를 중단한다" — 조용히 보정하지 않고 예외를 던진다.
 */

/** 범위 검증 실패. 자극물 로드 시점에 터져서 배포를 막는 것이 목적이다. */
export class FeatureRangeError extends Error {
  override readonly name = "FeatureRangeError";

  constructor(message: string) {
    super(message);
  }
}

/**
 * E·P·R 은 정수 등급·개월 수다. 사례 거리 계산이 정확한 유리수 산술이므로
 * 정수가 아니면 기준값을 재현할 수 없다.
 * T 는 주당 시간이므로 0.5 단위 소수를 허용한다(예: 2.5, 3.5).
 */
export const INTEGER_FEATURE_RANGES = {
  E: { min: 0, max: 24 },
  P: { min: 0, max: 6 },
  R: { min: 0, max: 4 },
} as const;

function assertIntegerInRange(
  key: keyof typeof INTEGER_FEATURE_RANGES,
  value: number,
  label: string,
): void {
  const { min, max } = INTEGER_FEATURE_RANGES[key];
  if (!Number.isInteger(value)) {
    throw new FeatureRangeError(`${label}: ${key} 는 정수여야 합니다 (받은 값 ${value})`);
  }
  if (value < min || value > max) {
    throw new FeatureRangeError(
      `${label}: ${key} 는 ${min}~${max} 범위여야 합니다 (받은 값 ${value})`,
    );
  }
}

/** 특성 범위를 검증한다. 실패 시 FeatureRangeError. */
export function assertFeatures(features: Features, label = "features"): void {
  assertIntegerInRange("E", features.E, label);
  assertIntegerInRange("P", features.P, label);
  assertIntegerInRange("R", features.R, label);

  const { T } = features;
  if (!Number.isFinite(T)) {
    throw new FeatureRangeError(`${label}: T 는 유한한 수여야 합니다 (받은 값 ${T})`);
  }
  if (T < 0) {
    throw new FeatureRangeError(`${label}: T 는 0 이상이어야 합니다 (받은 값 ${T})`);
  }
}

/** τ 검증. Low 2, High 4 (docs/02). 기준 집합이 τ±1 이므로 양수여야 한다. */
export function assertTau(tau: number, label = "tau"): void {
  if (!Number.isFinite(tau) || tau <= 0) {
    throw new FeatureRangeError(`${label}: τ 는 0 보다 큰 수여야 합니다 (받은 값 ${tau})`);
  }
}
