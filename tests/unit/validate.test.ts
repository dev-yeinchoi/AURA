import { describe, expect, it } from "vitest";
import {
  FeatureRangeError,
  assertFeatures,
  assertTau,
} from "@/server/rules/validate";

/** docs/02: E 0~24, P 0~6, R 0~4, T ≥ 0. 범위 밖은 예외. */
describe("assertFeatures", () => {
  it("범위 안 값은 통과한다", () => {
    expect(() => assertFeatures({ E: 0, P: 0, R: 0, T: 0 })).not.toThrow();
    expect(() => assertFeatures({ E: 24, P: 6, R: 4, T: 2.5 })).not.toThrow();
  });

  it.each([
    ["E 하한", { E: -1, P: 5, R: 3, T: 2 }],
    ["E 상한", { E: 25, P: 5, R: 3, T: 2 }],
    ["P 상한", { E: 6, P: 7, R: 3, T: 2 }],
    ["P 하한", { E: 6, P: -1, R: 3, T: 2 }],
    ["R 상한", { E: 6, P: 5, R: 5, T: 2 }],
    ["R 하한", { E: 6, P: 5, R: -1, T: 2 }],
    ["T 음수", { E: 6, P: 5, R: 3, T: -0.5 }],
  ])("범위 밖이면 예외: %s", (_label, features) => {
    expect(() => assertFeatures(features)).toThrow(FeatureRangeError);
  });

  it("E·P·R 이 정수가 아니면 예외 (유리수 산술 전제)", () => {
    expect(() => assertFeatures({ E: 6.5, P: 5, R: 3, T: 2 })).toThrow(FeatureRangeError);
    expect(() => assertFeatures({ E: 6, P: 5.5, R: 3, T: 2 })).toThrow(FeatureRangeError);
    expect(() => assertFeatures({ E: 6, P: 5, R: 3.5, T: 2 })).toThrow(FeatureRangeError);
  });

  it("T 는 0.5 단위 소수를 허용한다 (L03 2.5, H05 3.5)", () => {
    expect(() => assertFeatures({ E: 9, P: 5, R: 4, T: 2.5 })).not.toThrow();
    expect(() => assertFeatures({ E: 16, P: 5, R: 3, T: 3.5 })).not.toThrow();
  });

  it("T 가 NaN·Infinity 면 예외", () => {
    expect(() => assertFeatures({ E: 6, P: 5, R: 3, T: Number.NaN })).toThrow(FeatureRangeError);
    expect(() =>
      assertFeatures({ E: 6, P: 5, R: 3, T: Number.POSITIVE_INFINITY }),
    ).toThrow(FeatureRangeError);
  });

  it("오류 메시지에 라벨이 들어간다", () => {
    expect(() => assertFeatures({ E: 99, P: 5, R: 3, T: 2 }, "L01")).toThrow(/L01/);
  });
});

describe("assertTau", () => {
  it("Low 2, High 4 는 통과", () => {
    expect(() => assertTau(2)).not.toThrow();
    expect(() => assertTau(4)).not.toThrow();
  });

  it("0 이하나 비유한수는 예외", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertTau(bad)).toThrow(FeatureRangeError);
    }
  });
});
