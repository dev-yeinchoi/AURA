import { describe, expect, it } from "vitest";
import type { Features, Risk } from "@/lib/types";
import { A, G, confusionType } from "@/server/rules/rules";
import { buildCases, nearestCase } from "@/server/rules/cases";
import {
  BASELINE_SIZE,
  FEATURE_KEYS,
  baselineSet,
  baselineValue,
  shapleyValues,
} from "@/server/rules/shapley";
import { equals, parseRational, rational, sum, toRationalString } from "@/server/rules/rational";
import { assertFeatures, assertTau } from "@/server/rules/validate";
import { loadStimuli } from "@/server/stimuli/load";

/**
 * 계획 01 §2 핵심 테스트: TS 규칙 함수가 `data/stimuli/*.json` 을 **정확히** 재현한다.
 * 기준값은 scripts/generate_stimuli.py 가 Python Fraction 으로 만든 값이다.
 */

const RISKS: Risk[] = ["low", "high"];

const featuresOf = (p: { E: number; P: number; R: number; T: number }): Features => ({
  E: p.E,
  P: p.P,
  R: p.R,
  T: p.T,
});

describe.each(RISKS)("자극물 재현 — risk=%s", (risk) => {
  const stimuli = loadStimuli(risk);
  const { tau } = stimuli;
  const cases = buildCases(risk, tau);

  it("τ 가 docs/02 와 일치한다 (Low 2, High 4)", () => {
    expect(tau).toBe(risk === "low" ? 2 : 4);
    expect(() => assertTau(tau)).not.toThrow();
  });

  it("프로필 12명, 모든 특성이 범위 안에 있다", () => {
    expect(stimuli.profiles).toHaveLength(12);
    for (const p of stimuli.profiles) {
      expect(() => assertFeatures(featuresOf(p), p.profile_id)).not.toThrow();
    }
  });

  it("유형 구성이 TP 3 · FP 2 · FN 2 · TN 5 다", () => {
    const counts = { TP: 0, FP: 0, FN: 0, TN: 0 };
    for (const p of stimuli.profiles) counts[p.type] += 1;
    expect(counts).toEqual({ TP: 3, FP: 2, FN: 2, TN: 5 });
  });

  it("G 적격 5명, A 적격 5명, AI 정답 8/12 (docs/02)", () => {
    const gPositive = stimuli.profiles.filter((p) => p.G === 1).length;
    const aPositive = stimuli.profiles.filter((p) => p.A === 1).length;
    const correct = stimuli.profiles.filter((p) => p.G === p.A).length;
    expect(gPositive).toBe(5);
    expect(aPositive).toBe(5);
    expect(correct).toBe(8);
  });

  it("기준 집합이 16개이고 v(∅) = 1/8 이다", () => {
    const baseline = baselineSet(tau);
    expect(baseline).toHaveLength(BASELINE_SIZE);
    expect(toRationalString(baselineValue(baseline))).toBe("1/8");
    expect(toRationalString(baselineValue(baseline))).toBe(stimuli.baseline_v0);
  });

  it("비교 사례 16개가 ID·특성·A 판정까지 일치한다", () => {
    expect(cases).toHaveLength(16);
    expect(cases.map((c) => c.case_id)).toEqual(stimuli.cases.map((c) => c.case_id));
    for (const [index, expected] of stimuli.cases.entries()) {
      const actual = cases[index];
      expect(actual).toBeDefined();
      expect({
        case_id: actual?.case_id,
        E: actual?.E,
        P: actual?.P,
        R: actual?.R,
        T: actual?.T,
        A: actual?.A,
      }).toEqual(expected);
    }
  });

  describe.each(stimuli.profiles.map((p) => [p.profile_id, p] as const))(
    "프로필 %s",
    (_id, profile) => {
      const features = featuresOf(profile);
      const phi = shapleyValues(features, tau);

      it("G·A·유형이 기준값과 같다", () => {
        expect(G(features, tau)).toBe(profile.G);
        expect(A(features)).toBe(profile.A);
        expect(confusionType(profile.G, profile.A)).toBe(profile.type);
      });

      it("네 특성 기여도가 기준값과 같다", () => {
        for (const key of FEATURE_KEYS) {
          expect(toRationalString(phi[key])).toBe(profile.fi[key]);
        }
      });

      it("v0 + Σφ = A 이고 φT = 0 이다", () => {
        const total = sum([baselineValue(baselineSet(tau)), ...FEATURE_KEYS.map((k) => phi[k])]);
        expect(equals(total, rational(profile.A))).toBe(true);
        expect(toRationalString(phi.T)).toBe("0/1");
      });

      it("비교 사례 ID·거리·동률 수가 기준값과 같다", () => {
        const nearest = nearestCase(features, cases);
        expect(nearest.case.case_id).toBe(profile.case_id);
        expect(toRationalString(nearest.distance)).toBe(profile.case_distance);
        expect(nearest.tieCount).toBe(profile.case_tie_count);
      });
    },
  );
});

describe("기여도 패턴 표 (docs/01 fi)", () => {
  /** 통과 = E≥6, P≥5, R≥3. docs/01 의 8행 표를 그대로 확인한다. */
  const PATTERNS: Array<[number, number, number, string, string, string]> = [
    [0, 0, 0, "-1/24", "-1/24", "-1/24"],
    [0, 0, 1, "-1/12", "-1/12", "1/24"],
    [0, 1, 0, "-1/12", "1/24", "-1/12"],
    [0, 1, 1, "-7/24", "1/12", "1/12"],
    [1, 0, 0, "1/24", "-1/12", "-1/12"],
    [1, 0, 1, "1/12", "-7/24", "1/12"],
    [1, 1, 0, "1/12", "1/12", "-7/24"],
    [1, 1, 1, "7/24", "7/24", "7/24"],
  ];

  it.each(PATTERNS)(
    "E통과=%i P통과=%i R통과=%i → φE %s, φP %s, φR %s",
    (ePass, pPass, rPass, fiE, fiP, fiR) => {
      const features: Features = {
        E: ePass ? 9 : 3,
        // P 통과는 5 로 둔다. 6 은 G 의 보완 경로에만 영향을 주고 A 에는 영향이 없다.
        P: pPass ? 5 : 4,
        R: rPass ? 4 : 2,
        T: 2,
      };
      const phi = shapleyValues(features, 2);
      expect(toRationalString(phi.E)).toBe(fiE);
      expect(toRationalString(phi.P)).toBe(fiP);
      expect(toRationalString(phi.R)).toBe(fiR);
      expect(toRationalString(phi.T)).toBe("0/1");
    },
  );

  it("기여도 합은 항상 A − v0 다", () => {
    for (const E of [3, 9]) {
      for (const P of [4, 5, 6]) {
        for (const R of [2, 3, 4]) {
          const features: Features = { E, P, R, T: 2 };
          const phi = shapleyValues(features, 2);
          const total = sum([baselineValue(baselineSet(2)), ...FEATURE_KEYS.map((k) => phi[k])]);
          expect(equals(total, rational(A(features)))).toBe(true);
        }
      }
    }
  });

  it("φT 는 모든 조합에서 0 이다 (A 가 T 를 쓰지 않으므로)", () => {
    for (const tau of [2, 4]) {
      for (const T of [0, tau - 1, tau, tau + 1, 24]) {
        const phi = shapleyValues({ E: 9, P: 6, R: 4, T }, tau);
        expect(toRationalString(phi.T)).toBe("0/1");
      }
    }
  });
});

describe("parseRational 왕복 — 기준값 문자열", () => {
  it("JSON 의 모든 유리수 문자열이 정규형이다", () => {
    for (const risk of RISKS) {
      const stimuli = loadStimuli(risk);
      const texts = [
        stimuli.baseline_v0,
        ...stimuli.profiles.flatMap((p) => [
          p.case_distance,
          p.fi.E,
          p.fi.P,
          p.fi.R,
          p.fi.T,
        ]),
      ];
      for (const text of texts) {
        expect(toRationalString(parseRational(text))).toBe(text);
      }
    }
  });
});
