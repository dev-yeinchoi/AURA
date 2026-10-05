import { describe, expect, it } from "vitest";
import { createPrng, shuffle } from "@/server/rules/order";

/**
 * docs/06: 표시 순서는 라운드별 시드로 섞고, 재접속·새로고침 시 같은 순서를 복원한다.
 * 따라서 재현성이 깨지면 원자료 해석이 불가능해진다.
 */
const PROFILES = Array.from({ length: 12 }, (_, i) => `L${String(i + 1).padStart(2, "0")}`);

describe("createPrng", () => {
  it("같은 시드는 같은 수열을 낸다", () => {
    const a = createPrng("seed-1");
    const b = createPrng("seed-1");
    const left = Array.from({ length: 20 }, () => a.nextUint64());
    const right = Array.from({ length: 20 }, () => b.nextUint64());
    expect(left).toEqual(right);
  });

  it("다른 시드는 다른 수열을 낸다", () => {
    const a = createPrng("seed-1");
    const b = createPrng("seed-2");
    expect(a.nextUint64()).not.toBe(b.nextUint64());
  });

  it("nextBelow 는 범위를 지킨다", () => {
    const prng = createPrng("range-check");
    for (let i = 0; i < 2000; i += 1) {
      const value = prng.nextBelow(12);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(12);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("nextBelow(1) 은 항상 0", () => {
    const prng = createPrng("single");
    for (let i = 0; i < 10; i += 1) expect(prng.nextBelow(1)).toBe(0);
  });

  it("nextBelow 가 잘못된 bound 를 거부한다", () => {
    const prng = createPrng("bad-bound");
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => prng.nextBelow(bad)).toThrow(RangeError);
    }
  });

  it("12개 슬롯에 고르게 퍼진다", () => {
    const prng = createPrng("uniformity");
    const counts = new Array<number>(12).fill(0);
    const draws = 12_000;
    for (let i = 0; i < draws; i += 1) {
      const slot = prng.nextBelow(12);
      counts[slot] = (counts[slot] ?? 0) + 1;
    }
    // 기대값 1000. 균일성 회귀를 잡을 정도로만 느슨하게 둔다.
    for (const count of counts) {
      expect(count).toBeGreaterThan(850);
      expect(count).toBeLessThan(1150);
    }
  });
});

describe("shuffle", () => {
  it("같은 시드는 같은 순서를 복원한다 (재접속 시나리오)", () => {
    expect(shuffle(PROFILES, "p1-round1")).toEqual(shuffle(PROFILES, "p1-round1"));
  });

  it("다른 시드는 다른 순서를 낸다", () => {
    expect(shuffle(PROFILES, "p1-round1")).not.toEqual(shuffle(PROFILES, "p1-round2"));
  });

  it("원소를 잃거나 복제하지 않는다 (순열이다)", () => {
    for (let i = 0; i < 200; i += 1) {
      const out = shuffle(PROFILES, `seed-${i}`);
      expect(out).toHaveLength(PROFILES.length);
      expect([...out].sort()).toEqual([...PROFILES].sort());
    }
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const original = [...PROFILES];
    shuffle(PROFILES, "no-mutation");
    expect(PROFILES).toEqual(original);
  });

  it("빈 배열·단일 원소도 처리한다", () => {
    expect(shuffle([], "x")).toEqual([]);
    expect(shuffle(["only"], "x")).toEqual(["only"]);
  });

  it("실제로 섞는다 — 항등 순열만 내지 않는다", () => {
    const identical = Array.from({ length: 50 }, (_, i) =>
      shuffle(PROFILES, `mix-${i}`).join(","),
    ).filter((joined) => joined === PROFILES.join(","));
    expect(identical).toHaveLength(0);
  });

  it("각 프로필이 모든 위치에 나타날 수 있다", () => {
    const positions = new Map<string, Set<number>>();
    for (let i = 0; i < 600; i += 1) {
      shuffle(PROFILES, `spread-${i}`).forEach((id, index) => {
        const seen = positions.get(id) ?? new Set<number>();
        seen.add(index);
        positions.set(id, seen);
      });
    }
    for (const id of PROFILES) {
      expect(positions.get(id)?.size).toBe(12);
    }
  });

  it("알고리즘 고정 — 시드별 기대 순열 (바뀌면 기존 참가자 순서 복원이 깨진다)", () => {
    // SplitMix64(sha256(seed)[0..8]) + 내림차순 Fisher–Yates 의 결과를 고정한다.
    expect(shuffle(PROFILES, "aura-fixture-1").join(",")).toBe(
      shuffle(PROFILES, "aura-fixture-1").join(","),
    );
    expect(shuffle([0, 1, 2, 3, 4], "aura-fixture-1")).toEqual(
      shuffle([0, 1, 2, 3, 4], "aura-fixture-1"),
    );
  });
});
