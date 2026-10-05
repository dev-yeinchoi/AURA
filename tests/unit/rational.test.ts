import { describe, expect, it } from "vitest";
import {
  ONE,
  ZERO,
  add,
  compare,
  div,
  equals,
  mul,
  neg,
  parseRational,
  rational,
  sub,
  sum,
  toNumber,
  toRationalString,
} from "@/server/rules/rational";

/** Python fractions.Fraction 의 정규형·직렬화와 일치해야 한다. */
describe("rational", () => {
  it("약분하고 분모를 양수로 정규화한다", () => {
    expect(rational(14, 48)).toEqual({ n: 7n, d: 24n });
    expect(rational(-14, 48)).toEqual({ n: -7n, d: 24n });
    expect(rational(14, -48)).toEqual({ n: -7n, d: 24n });
    expect(rational(-14, -48)).toEqual({ n: 7n, d: 24n });
  });

  it("0 은 0/1 로 정규화한다 (Python Fraction 과 동일)", () => {
    expect(rational(0, 7)).toEqual({ n: 0n, d: 1n });
    expect(toRationalString(rational(0, 7))).toBe("0/1");
    expect(toRationalString(ZERO)).toBe("0/1");
  });

  it("분모 0 은 예외", () => {
    expect(() => rational(1, 0)).toThrow(RangeError);
  });

  it("정수가 아닌 입력은 예외", () => {
    expect(() => rational(1.5)).toThrow(TypeError);
  });

  it("사칙연산이 정확하다", () => {
    const a = rational(7, 24);
    const b = rational(1, 12);
    expect(toRationalString(add(a, b))).toBe("3/8");
    expect(toRationalString(sub(a, b))).toBe("5/24");
    expect(toRationalString(mul(a, b))).toBe("7/288");
    expect(toRationalString(div(a, b))).toBe("7/2");
    expect(toRationalString(neg(a))).toBe("-7/24");
  });

  it("0 으로 나누면 예외", () => {
    expect(() => div(ONE, ZERO)).toThrow(RangeError);
  });

  it("부동소수점으로는 틀리는 합을 정확히 더한다", () => {
    // 1/10 을 10번 더하면 double 로는 1 이 되지 않는다.
    const tenth = rational(1, 10);
    const ten = sum(Array.from({ length: 10 }, () => tenth));
    expect(equals(ten, ONE)).toBe(true);
    expect(toRationalString(ten)).toBe("1/1");

    let floatAcc = 0;
    for (let i = 0; i < 10; i += 1) floatAcc += 0.1;
    expect(floatAcc).not.toBe(1);
  });

  it("비교는 교차곱으로 정확하다", () => {
    expect(compare(rational(1, 3), rational(1, 2))).toBe(-1);
    expect(compare(rational(1, 2), rational(1, 3))).toBe(1);
    expect(compare(rational(2, 4), rational(1, 2))).toBe(0);
    expect(compare(rational(-1, 24), rational(1, 24))).toBe(-1);
  });

  it("직렬화와 파싱이 왕복한다", () => {
    for (const text of ["7/24", "0/1", "-1/24", "13/72", "1/8"] as const) {
      expect(toRationalString(parseRational(text))).toBe(text);
    }
  });

  it("형식이 아닌 문자열은 예외", () => {
    for (const bad of ["7", "7/", "/24", "7.5/24", "7/-24", ""]) {
      expect(() => parseRational(bad)).toThrow(TypeError);
    }
  });

  it("toNumber 는 표시용 근사값", () => {
    expect(toNumber(rational(7, 24))).toBeCloseTo(0.2916667, 7);
  });
});
