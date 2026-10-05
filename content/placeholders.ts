/**
 * 화면 문구 플레이스홀더.
 *
 * docs/00 C 의 미결 항목은 추측하지 않고 여기 TODO로 둔다(CLAUDE.md 작업 방식).
 * 시나리오 원문·설문 문항·선정 기준은 **여기에 쓰지 않는다**.
 * 그 문구들은 docs/02·docs/03 에서 콘텐츠 파일로 분리해 가져온다(규칙 3).
 */

export const PLACEHOLDER = {
  /** 1 대면 안내 — TODO: 공통 안내문 (docs/06 단계 1) */
  briefing: "TODO: 대면 공통 안내문",
  /** 2 동의 본문 — TODO: IRB 승인본 (docs/00 C) */
  consentBody: "TODO: 동의서 본문",
  /** 8 사후 자유 응답 — TODO: 문항 문구 (선택 응답) */
  freeResponsePrompt: "TODO: 자유 응답 문항",
  /** 연구자 시작 화면 안내 (계획 D4: 패스코드는 환경변수) */
  researcherStart: "TODO: 연구자 시작 화면 안내",
} as const;

/** 프로필 카드 라벨. docs/00 B-4 현재 기본값 "직원". 확정 시 이 값만 바꾼다. */
export const PROFILE_LABEL = "직원";
