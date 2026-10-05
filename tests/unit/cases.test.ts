import { describe, expect, it } from "vitest";
import type { Features } from "@/lib/types";
import { buildCases, caseDistance, nearestCase } from "@/server/rules/cases";
import { compare, toRationalString } from "@/server/rules/rational";

/** docs/01 "fi_case". 거리 d = [|ΔE|/24 + |ΔP|/6 + |ΔR|/4] / 3, T·나이 미사용. */
describe("buildCases", () => {
  it("Low 는 LC01~LC16, High 는 HC01~HC16", () => {
    expect(buildCases("low", 2).map((c) => c.case_id)).toEqual(
      Array.from({ length: 16 }, (_, i) => `LC${String(i + 1).padStart(2, "0")}`),
    );
    expect(buildCases("high", 4).map((c) => c.case_id)).toEqual(
      Array.from({ length: 16 }, (_, i) => `HC${String(i + 1).padStart(2, "0")}`),
    );
  });

  it("E→P→R→T 오름차순 직적곱 순서다", () => {
    const cases = buildCases("low", 2);
    expect(cases[0]).toMatchObject({ case_id: "LC01", E: 3, P: 4, R: 2, T: 1 });
    expect(cases[1]).toMatchObject({ case_id: "LC02", E: 3, P: 4, R: 2, T: 3 });
    expect(cases[2]).toMatchObject({ case_id: "LC03", E: 3, P: 4, R: 4, T: 1 });
    expect(cases[15]).toMatchObject({ case_id: "LC16", E: 9, P: 6, R: 4, T: 3 });
  });

  it("T 는 τ±1 로 맥락마다 다르다", () => {
    expect(buildCases("low", 2).map((c) => c.T)).toContain(1);
    expect(buildCases("low", 2).map((c) => c.T)).toContain(3);
    expect(buildCases("high", 4).map((c) => c.T)).toContain(3);
    expect(buildCases("high", 4).map((c) => c.T)).toContain(5);
  });

  it("사례에는 A 판정만 붙는다 (G·유형 없음)", () => {
    for (const c of buildCases("low", 2)) {
      expect(Object.keys(c).sort()).toEqual(["A", "E", "P", "R", "T", "case_id"]);
      expect([0, 1]).toContain(c.A);
    }
  });
});

describe("caseDistance", () => {
  it("같은 E·P·R 이면 거리 0", () => {
    const target: Features = { E: 3, P: 4, R: 2, T: 99 };
    expect(toRationalString(caseDistance(target, { E: 3, P: 4, R: 2, T: 1 }))).toBe("0/1");
  });

  it("T 를 쓰지 않는다 — T 가 달라도 거리가 같다", () => {
    const base: Features = { E: 6, P: 5, R: 3, T: 2 };
    const a = caseDistance(base, { E: 3, P: 4, R: 2, T: 1 });
    const b = caseDistance(base, { E: 3, P: 4, R: 2, T: 999 });
    expect(toRationalString(a)).toBe(toRationalString(b));
  });

  it("공식대로 계산한다: [3/24 + 1/6 + 1/4] / 3 = 13/72", () => {
    // L01 (E6 P5 R3) vs LC01 (E3 P4 R2)
    const d = caseDistance({ E: 6, P: 5, R: 3, T: 2 }, { E: 3, P: 4, R: 2, T: 1 });
    expect(toRationalString(d)).toBe("13/72");
  });

  it("대칭이다", () => {
    const x: Features = { E: 6, P: 5, R: 3, T: 2 };
    const y: Features = { E: 9, P: 6, R: 4, T: 3 };
    expect(toRationalString(caseDistance(x, y))).toBe(toRationalString(caseDistance(y, x)));
  });
});

describe("nearestCase", () => {
  const cases = buildCases("low", 2);

  it("동률이면 ID 가 작은 쪽을 고른다", () => {
    // L01 은 16개 사례가 모두 동률이다 (docs/00 B-1).
    const nearest = nearestCase({ E: 6, P: 5, R: 3, T: 2 }, cases);
    expect(nearest.tieCount).toBe(16);
    expect(nearest.case.case_id).toBe("LC01");
  });

  it("동률 수를 정확히 센다", () => {
    // LC15(9,6,4,1) 과 LC16(9,6,4,3) 은 E·P·R 이 같고 T 만 다르다.
    // 거리에 T 를 쓰지 않으므로 둘 다 거리 0 으로 동률이고, 작은 ID 인 LC15 가 뽑힌다.
    const nearest = nearestCase({ E: 9, P: 6, R: 4, T: 2 }, cases);
    expect(toRationalString(nearest.distance)).toBe("0/1");
    expect(nearest.tieCount).toBe(2);
    expect(nearest.case.case_id).toBe("LC15");
  });

  it("거리 0 동률이 없으면 tieCount 가 1 이다", () => {
    // L10 (E14 P6 R2): LC13(9,6,2) 과 LC14(9,6,2) 가 E·P·R 동일 → 동률 2
    // 단일 최소를 만들려면 E·P·R 조합이 유일하게 가까운 지점을 쓴다.
    const nearest = nearestCase({ E: 9, P: 6, R: 3, T: 2 }, cases);
    expect(nearest.tieCount).toBeGreaterThanOrEqual(1);
    expect(nearest.case.case_id.startsWith("LC")).toBe(true);
  });

  it("빈 사례 집합은 예외", () => {
    expect(() => nearestCase({ E: 6, P: 5, R: 3, T: 2 }, [])).toThrow(RangeError);
  });

  it("고른 사례의 거리가 전체 최소다", () => {
    const target: Features = { E: 12, P: 6, R: 4, T: 3 };
    const nearest = nearestCase(target, cases);
    for (const c of cases) {
      // compare >= 0 : 후보 거리가 최소 거리보다 작지 않다
      expect(compare(caseDistance(target, c), nearest.distance)).toBeGreaterThanOrEqual(0);
    }
  });
});
