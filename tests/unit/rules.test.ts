import { describe, expect, it } from "vitest";
import type { Features } from "@/lib/types";
import { A, G, confusionType } from "@/server/rules/rules";

const f = (E: number, P: number, R: number, T: number): Features => ({ E, P, R, T });

/** docs/02 "판정 규칙" 경계값. 계획 01 §2 테스트 목록. */
describe("G (연구용 적격 기준)", () => {
  const TAU = 2;

  it("네 조건을 모두 만족하면 적격", () => {
    expect(G(f(6, 5, 3, 2), TAU)).toBe(1);
  });

  it("T = τ 는 통과, τ − 0.5 는 탈락", () => {
    expect(G(f(6, 5, 3, TAU), TAU)).toBe(1);
    expect(G(f(6, 5, 3, TAU - 0.5), TAU)).toBe(0);
  });

  it("E 경계: 5 는 탈락, 6 은 통과 (P < 6 일 때)", () => {
    expect(G(f(5, 5, 3, 2), TAU)).toBe(0);
    expect(G(f(6, 5, 3, 2), TAU)).toBe(1);
  });

  it("P = 6 이면 경험 요건을 보완한다 (E = 0 이어도 적격)", () => {
    expect(G(f(0, 6, 3, 2), TAU)).toBe(1);
    expect(G(f(5, 6, 3, 2), TAU)).toBe(1);
  });

  it("P 경계: 4 는 탈락, 5 는 통과", () => {
    expect(G(f(6, 4, 3, 2), TAU)).toBe(0);
    expect(G(f(6, 5, 3, 2), TAU)).toBe(1);
  });

  it("R 경계: 2 는 탈락, 3 은 통과", () => {
    expect(G(f(6, 5, 2, 2), TAU)).toBe(0);
    expect(G(f(6, 5, 3, 2), TAU)).toBe(1);
  });

  it("τ 는 맥락에서 온다 (Low 2, High 4)", () => {
    expect(G(f(6, 5, 3, 3), 2)).toBe(1);
    expect(G(f(6, 5, 3, 3), 4)).toBe(0);
  });
});

describe("A (AURA 추천 규칙)", () => {
  it("E·P·R 세 조건만 본다", () => {
    expect(A(f(6, 5, 3, 0))).toBe(1);
  });

  it("T 를 쓰지 않는다 — T 가 달라도 결과가 같다", () => {
    for (const T of [0, 1, 2, 2.5, 100]) {
      expect(A(f(6, 5, 3, T))).toBe(1);
      expect(A(f(5, 5, 3, T))).toBe(0);
    }
  });

  it("P = 6 의 경험 보완 경로를 적용하지 않는다 (G 와 다른 지점)", () => {
    const target = f(0, 6, 3, 2);
    expect(A(target)).toBe(0);
    expect(G(target, 2)).toBe(1);
  });

  it("E 경계: 5 는 탈락, 6 은 통과", () => {
    expect(A(f(5, 6, 4, 9))).toBe(0);
    expect(A(f(6, 6, 4, 9))).toBe(1);
  });
});

describe("confusionType", () => {
  it("G·A 조합을 유형으로 옮긴다", () => {
    expect(confusionType(1, 1)).toBe("TP");
    expect(confusionType(0, 1)).toBe("FP");
    expect(confusionType(1, 0)).toBe("FN");
    expect(confusionType(0, 0)).toBe("TN");
  });
});
