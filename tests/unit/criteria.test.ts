import { describe, expect, it } from "vitest";
import {
  CRITERIA_SOURCE,
  commonResponseNotice,
  criteriaSummary,
  selectionCriteria,
} from "@/content/criteria";

/**
 * docs/02 선정 기준 + docs/00 B-3 (맥락별 렌더링 기본값).
 */
describe("selectionCriteria", () => {
  it("맥락별로 선택지 표기가 하나만 남는다", () => {
    for (const risk of ["low", "high"] as const) {
      const text = selectionCriteria(risk);
      expect(text).not.toContain("[2/4]");
      expect(text).not.toContain("6회·6건");
      expect(text).not.toContain("5회·5건");
    }
  });

  it("Low 는 2시간·6회·5회", () => {
    const text = selectionCriteria("low");
    expect(text).toContain("주당 2시간 이상");
    expect(text).toContain("6회 중 5회 이상");
    expect(text).toContain("6회를 모두 충족");
    expect(text).not.toContain("4시간");
  });

  it("High 는 4시간·6건·5건", () => {
    const text = selectionCriteria("high");
    expect(text).toContain("주당 4시간 이상");
    expect(text).toContain("6건 중 5건 이상");
    expect(text).toContain("6건을 모두 충족");
    expect(text).not.toContain("2시간");
  });

  it("두 맥락 모두 원문의 고정 문장을 그대로 유지한다", () => {
    const fixed = [
      "아래 기준에 따라 각 직원이 해당 역할에 적격인지 판단해 주세요.",
      "최근 4건 중 3건 이상을 기한 내 이행했으며",
      "나이는 판단 기준에 포함되지 않습니다.",
      "적격 인원수에 제한은 없습니다.",
    ];
    for (const risk of ["low", "high"] as const) {
      for (const sentence of fixed) {
        expect(selectionCriteria(risk)).toContain(sentence);
        expect(CRITERIA_SOURCE).toContain(sentence);
      }
    }
  });

  it("원문과 길이가 비슷하다 — 문장이 빠지지 않았다", () => {
    for (const risk of ["low", "high"] as const) {
      const diff = Math.abs(selectionCriteria(risk).length - CRITERIA_SOURCE.length);
      expect(diff).toBeLessThan(20);
    }
  });
});

describe("criteriaSummary", () => {
  it("여섯 항목이고 맥락별 단위를 쓴다", () => {
    expect(criteriaSummary("low")).toHaveLength(6);
    expect(criteriaSummary("low")[0]).toContain("2시간");
    expect(criteriaSummary("high")[0]).toContain("4시간");
    expect(criteriaSummary("low")[2]).toContain("6회 중 5회");
    expect(criteriaSummary("high")[2]).toContain("6건 중 5건");
  });

  it("나이 제외와 인원 제한 없음을 명시한다", () => {
    for (const risk of ["low", "high"] as const) {
      const joined = criteriaSummary(risk).join(" ");
      expect(joined).toContain("나이는 판단 기준에 포함되지 않음");
      expect(joined).toContain("적격 인원수 제한 없음");
    }
  });
});

describe("commonResponseNotice", () => {
  it("12명·인원 제한 없음·독립 판단을 안내한다 (docs/02 원문)", () => {
    for (const risk of ["low", "high"] as const) {
      const text = commonResponseNotice(risk);
      expect(text).toContain("총 12명");
      expect(text).toContain("적격 인원수에 제한은 없습니다");
      expect(text).toContain("독립적으로 판단해 주세요");
    }
  });

  it("맥락별 역할 표현이 다르다", () => {
    expect(commonResponseNotice("low")).toContain("운영진 역할");
    expect(commonResponseNotice("high")).toContain("예산 관리 총괄팀");
  });
});
