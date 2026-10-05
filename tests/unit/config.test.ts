import { describe, expect, it } from "vitest";
import {
  AI_REVEAL_DELAY_SECONDS,
  CELLS_PER_BLOCK,
  PLANNED_SECONDS,
  PROFILES_PER_ROUND,
  ROUNDS,
  ROUND_STEP_ORDER,
  STAGE_ORDER,
  VERSIONS,
} from "@/config/experiment";

/**
 * 설정 단일 출처 검증 (계획 01 §1). 규칙 함수 테스트는 체크포인트 2에서 추가한다.
 */
describe("config/experiment", () => {
  it("배정 블록은 authority(2) × explanation(3) × risk_order(2) = 12셀", () => {
    expect(CELLS_PER_BLOCK).toBe(2 * 3 * 2);
  });

  it("라운드당 프로필 12명, 라운드 2개 (docs/02, docs/06)", () => {
    expect(PROFILES_PER_ROUND).toBe(12);
    expect(ROUNDS).toBe(2);
  });

  it("AI 제시 전 중립 대기는 10초 (docs/06)", () => {
    expect(AI_REVEAL_DELAY_SECONDS).toBe(10);
  });

  it("라운드 내부 단계마다 예정 시간이 정의되어 있다", () => {
    for (const step of ROUND_STEP_ORDER) {
      expect(PLANNED_SECONDS[step]).toBeTypeOf("number");
      expect(PLANNED_SECONDS[step]).toBeGreaterThanOrEqual(0);
    }
  });

  it("단계 순서에 중복이 없다", () => {
    expect(new Set(STAGE_ORDER).size).toBe(STAGE_ORDER.length);
    expect(new Set(ROUND_STEP_ORDER).size).toBe(ROUND_STEP_ORDER.length);
  });

  it("자극물 버전이 data/stimuli 기준값과 같은 리비전이다", () => {
    expect(VERSIONS.stimulus).toBe("rev08");
  });
});
