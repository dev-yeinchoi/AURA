import { describe, expect, it } from "vitest";
import type { Features } from "@/lib/types";
import { A, G } from "@/server/rules/rules";
import { buildCases, caseDistance, nearestCase } from "@/server/rules/cases";
import { shapleyValues } from "@/server/rules/shapley";

/**
 * 나이는 G·A·FI·사례 거리 함수의 입력에 포함되지 않는다
 * (CLAUDE.md 규칙 5, docs/02 "함수 시그니처에서 제외").
 *
 * 런타임 검사가 아니라 **컴파일 시** 막혀야 하므로 @ts-expect-error 로 고정한다.
 * 타입이 느슨해지면 directive 가 unused 가 되어 pnpm typecheck 가 실패한다.
 *
 * `Features` 로만 받으면 구조적 타이핑 때문에 age 가 달린 **변수**는 그대로
 * 통과한다(excess property check 는 객체 리터럴에만 적용된다). 그래서
 * `FeaturesOnly<T>` 로 남는 키를 never 로 막았고, 아래 테스트는 변수와
 * 리터럴 두 경로를 모두 확인한다.
 */
describe("나이 입력 배제 (컴파일 시 검증)", () => {
  const withAgeVar = { E: 6, P: 5, R: 3, T: 2, age: 32 };
  const plainVar: Features = { E: 6, P: 5, R: 3, T: 2 };

  it("G: age 가 달린 변수는 타입 오류", () => {
    // @ts-expect-error age 는 Features 에 없다
    expect(G(withAgeVar, 2)).toBe(1);
  });

  it("G: age 가 달린 리터럴도 타입 오류", () => {
    // @ts-expect-error age 는 Features 에 없다
    expect(G({ E: 6, P: 5, R: 3, T: 2, age: 32 }, 2)).toBe(1);
  });

  it("A: age 가 달린 변수는 타입 오류", () => {
    // @ts-expect-error age 는 Features 에 없다
    expect(A(withAgeVar)).toBe(1);
  });

  it("A: age 가 달린 리터럴도 타입 오류", () => {
    // @ts-expect-error age 는 Features 에 없다
    expect(A({ E: 6, P: 5, R: 3, T: 2, age: 32 })).toBe(1);
  });

  it("shapleyValues: age 가 달린 변수는 타입 오류", () => {
    // @ts-expect-error age 는 Features 에 없다
    expect(Object.keys(shapleyValues(withAgeVar, 2))).toHaveLength(4);
  });

  it("caseDistance: 판단 대상에 age 가 달리면 타입 오류", () => {
    // @ts-expect-error age 는 Features 에 없다
    expect(caseDistance(withAgeVar, plainVar)).toBeDefined();
  });

  it("nearestCase: 판단 대상에 age 가 달리면 타입 오류", () => {
    // @ts-expect-error age 는 Features 에 없다
    expect(nearestCase(withAgeVar, buildCases("low", 2))).toBeDefined();
  });

  it("E·P·R·T 만 담은 변수·리터럴은 정상 호출된다", () => {
    expect(G(plainVar, 2)).toBe(1);
    expect(G({ E: 6, P: 5, R: 3, T: 2 }, 2)).toBe(1);
    expect(A(plainVar)).toBe(1);
    expect(Object.keys(shapleyValues(plainVar, 2))).toEqual(["E", "P", "R", "T"]);
    expect(caseDistance(plainVar, plainVar)).toBeDefined();
  });

  it("비교 사례는 case_id·A 를 가지므로 후보 쪽은 Features 로 받는다", () => {
    // 사례에는 나이가 없다. 거리 계산에 쓰이는 값은 E·P·R 뿐이다.
    const cases = buildCases("low", 2);
    for (const c of cases) {
      expect(c).not.toHaveProperty("age");
    }
    expect(nearestCase(plainVar, cases).case.case_id).toBe("LC01");
  });

  it("Features 타입에는 age 키가 없다", () => {
    expect(Object.keys(plainVar).sort()).toEqual(["E", "P", "R", "T"]);
  });
});
