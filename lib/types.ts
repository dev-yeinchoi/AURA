/**
 * 클라이언트와 공유 가능한 타입만 둔다. 런타임 값(상수·객체)은 두지 않는다.
 *
 * 조건명(authority/explanation/risk_order)은 **타입으로만** 존재한다.
 * 타입은 컴파일 시 사라지므로 클라이언트 번들에 문자열로 남지 않는다
 * (CLAUDE.md 실험 무결성 규칙 6).
 */

/** 권위 조작 수준. 서버에서만 값으로 다룬다. */
export type Authority = "low" | "high";

/** 설명 유형. 서버에서만 값으로 다룬다. */
export type Explanation = "none" | "fi" | "fi_case";

/** 위험 맥락. 자극물 로드 키이기도 하다(규칙 4: 라운드 번호가 아니라 risk로 로드). */
export type Risk = "low" | "high";

/** 라운드 1에 제시되는 위험 맥락 순서. */
export type RiskOrder = "low_first" | "high_first";

/** 라운드 번호. */
export type Round = 1 | 2;

/** 이진 판단. 적격=1, 부적격=0, 무응답=null (규칙 8: 기본값 없음). */
export type Judgment = 0 | 1 | null;

/** 혼동행렬 유형. 서버 전용 — 클라이언트로 보내지 않는다(규칙 2). */
export type ConfusionType = "TP" | "FP" | "FN" | "TN";

/** 프로필 특성. age는 규칙·기여도·사례 계산에 들어가지 않는다(규칙 5). */
export interface Features {
  /** 경력 개월 수 */
  E: number;
  /** 성과 평가 /6 */
  P: number;
  /** 추천 등급 /4 */
  R: number;
  /** 주당 가능 시간 */
  T: number;
}

/** 정확한 유리수 직렬화 형식. 예: "7/24", "0/1" */
export type RationalString = `${number}/${number}`;

/** 실험 진행 단계. docs/06 전체 흐름의 단계 번호를 따른다(5번은 원문에 없음). */
export type Stage =
  | "researcher_start"
  | "briefing"
  | "consent"
  | "demographics"
  | "ppd_pre"
  | "assignment"
  | "round_1"
  | "round_2"
  | "post_survey"
  | "done";

/** 라운드 내부 단계. 조건과 무관하게 모든 셀에서 동일하다. */
export type RoundStep =
  | "scenario"
  | "risk_check"
  | "free_review"
  | "initial_judgment"
  | "ai_reveal"
  | "final_judgment"
  | "trust";
