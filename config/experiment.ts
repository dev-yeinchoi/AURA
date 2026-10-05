import type { RoundStep, Stage } from "@/lib/types";

/**
 * 실험 설정 단일 출처.
 *
 * 시간 값은 전부 여기에만 둔다(CLAUDE.md 규칙 9, docs/06 "시간 규칙").
 * 시간은 **예정 소요 시간 안내**일 뿐이며 강제 종료·자동 부적격 처리에 쓰지 않는다.
 * 초과 시에는 초과 시작 시각만 기록한다.
 *
 * 이 파일은 클라이언트에서도 import할 수 있으므로 조건명·자극물·정답을 넣지 않는다.
 */

/** 버전 태그. 지표·자극물·설문 계산 결과에 함께 저장한다. */
export const VERSIONS = {
  /** data/stimuli/*.json 의 stimulus_version 과 일치해야 한다. */
  stimulus: "rev08",
  /** 명세 리비전 */
  spec: "rev08",
  /** 동의서 본문 버전 — TODO: IRB 승인본으로 교체 (docs/00 C) */
  consent: "consent-placeholder-v0",
  /** 설문 문항 세트 버전 (docs/03) */
  survey: "survey-rev08",
  /** 의존 지표 계산 버전 (docs/04) */
  metrics: "metrics-rev08",
} as const;

/** 라운드당 프로필 수. docs/02 */
export const PROFILES_PER_ROUND = 12;

/** 라운드 수. docs/06 */
export const ROUNDS = 2;

/** 배정 블록 크기 = authority(2) × explanation(3) × risk_order(2). docs/06 */
export const CELLS_PER_BLOCK = 12;

/**
 * 단계별 예정 소요 시간(초). docs/06 "라운드 내부 순서".
 * 안내 표시용이며, 초과해도 진행을 막지 않는다.
 */
export const PLANNED_SECONDS: Record<RoundStep, number> = {
  /** 시나리오 + Risk 확인 3분 (RMC 3문항 포함) */
  scenario: 180,
  risk_check: 0,
  /** 자유 열람 5분 */
  free_review: 300,
  /** 초기 판단 2분 */
  initial_judgment: 120,
  /** AI 제시 2분 (아래 중립 대기 10초는 별도) */
  ai_reveal: 120,
  /** 최종 판단 2분 */
  final_judgment: 120,
  /** S-TIAS 3문항 1분 */
  trust: 60,
};

/**
 * AI 제시 직전 중립 대기(초). docs/06 "AI 제시 10초 + 2분".
 * 이 대기 화면에는 권위 문구·배지가 아직 나타나지 않는다(규칙 6).
 */
export const AI_REVEAL_DELAY_SECONDS = 10;

/** 시나리오와 Risk 확인을 한 화면에서 처리하므로 안내는 합산값으로 보여준다. */
export const SCENARIO_STEP_SECONDS =
  PLANNED_SECONDS.scenario + PLANNED_SECONDS.risk_check;

/** 참가자 세션 쿠키. 서명된 httpOnly 쿠키만 쓴다(계획 D3). 이름에 조건·단계를 담지 않는다. */
export const SESSION_COOKIE_NAME = "aura_sid";

/** 세션 쿠키 유효 기간(초). 대면 실험 1회분 + 여유. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 6;

/** 기준 환경. 화면 구현 후 이 해상도로 점검한다(docs/00 C, docs/06). */
export const VIEWPORT_BASELINE = { width: 1280, height: 720 } as const;

/** docs/06 전체 흐름 순서. 서버 상태 머신의 기준 순서다. */
export const STAGE_ORDER: readonly Stage[] = [
  "researcher_start",
  "briefing",
  "consent",
  "demographics",
  "ppd_pre",
  "assignment",
  "round_1",
  "round_2",
  "post_survey",
  "done",
];

/** 라운드 내부 순서. 모든 조건에서 동일하다(규칙 1). */
export const ROUND_STEP_ORDER: readonly RoundStep[] = [
  "scenario",
  "risk_check",
  "free_review",
  "initial_judgment",
  "ai_reveal",
  "final_judgment",
  "trust",
];

/**
 * 인구통계 "AI 사용 경험" 범주 — TODO: 연구자 확정 전 플레이스홀더 (docs/00 C).
 * 기준 기간도 미확정이므로 문구를 그대로 쓰지 않는다.
 */
export const AI_EXPERIENCE_OPTIONS_PLACEHOLDER: readonly string[] = [
  "TODO-1",
  "TODO-2",
  "TODO-3",
  "TODO-4",
];
