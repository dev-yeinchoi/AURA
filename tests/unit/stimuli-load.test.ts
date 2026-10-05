import { describe, expect, it } from "vitest";
import { canonicalize, loadStimuli, stimuliHash } from "@/server/stimuli/load";

/** 계획 01 §2: JSON 로드 + zod 검증 + 정규화 JSON sha256. */
describe("canonicalize", () => {
  it("키 순서와 공백에 무관하다", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
    expect(canonicalize(JSON.parse('{"a":1,  "b":[1, 2]}'))).toBe(
      canonicalize(JSON.parse('{"b":[1,2],"a":1}')),
    );
  });

  it("배열 순서는 유지한다", () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it("중첩 객체도 정렬한다", () => {
    expect(canonicalize({ x: { b: 1, a: 2 } })).toBe('{"x":{"a":2,"b":1}}');
  });
});

describe("loadStimuli", () => {
  it("risk 를 키로 로드한다 (라운드 번호가 아니라)", () => {
    expect(loadStimuli("low").risk).toBe("low");
    expect(loadStimuli("high").risk).toBe("high");
  });

  it("두 번 호출하면 같은 객체를 돌려준다 (캐시)", () => {
    expect(loadStimuli("low")).toBe(loadStimuli("low"));
  });

  it("규칙 버전이 rev08 이다", () => {
    for (const risk of ["low", "high"] as const) {
      expect(loadStimuli(risk).rule_versions).toEqual({
        G: "G-rev08",
        A: "A-rev08",
        FI: "FI-rev08",
        case: "case-rev08",
      });
    }
  });

  it("server-only 표시가 자극물에 남아 있다", () => {
    expect(loadStimuli("low")._note).toContain("SERVER-ONLY");
  });
});

describe("stimuliHash", () => {
  it("같은 파일에 대해 항상 같은 해시를 낸다", () => {
    expect(stimuliHash("low")).toBe(stimuliHash("low"));
    expect(stimuliHash("low")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("low 와 high 는 다른 해시다", () => {
    expect(stimuliHash("low")).not.toBe(stimuliHash("high"));
  });

  /**
   * 자극물 고정 핀.
   *
   * `data/stimuli/*.json` 은 scripts/generate_stimuli.py 재생성으로만 바뀐다
   * (CLAUDE.md 작업 방식). 손으로 고친 변경을 잡기 위해 해시를 고정한다.
   * 자극물을 의도적으로 재생성했다면 이 값을 함께 갱신하고, 재생성 사실을
   * 커밋 메시지에 남긴다.
   */
  it("핀된 해시와 일치한다", () => {
    expect(stimuliHash("low")).toBe("5160cbdccd7dd2b698fbcfdea4e72edfbdc84b4d33e63de6c4aca511a529f2f6");
    expect(stimuliHash("high")).toBe("48b81ea25eb6f53e835cfc37d66115e671b1c76817e282593ad2c6b72c743592");
  });
});
