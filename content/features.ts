import type { Risk } from "@/lib/types";

/**
 * 프로필 특성 라벨 (docs/02 "프로필 표시 특성").
 *
 * 특성 순서는 항상 E/P/R/T 다. 맥락(Low/High)에 따라 문구만 달라지고,
 * 조건(authority/explanation)과는 무관하다 — 6조건에서 동일하게 보인다.
 */

export const FEATURE_ORDER = ["E", "P", "R", "T"] as const;
export type FeatureKey = (typeof FEATURE_ORDER)[number];

export interface FeatureLabel {
  /** 화면에 쓰는 짧은 라벨 */
  readonly short: string;
  /** 카드에 쓰는 설명 문구 (docs/02 표 원문) */
  readonly description: string;
  /** 값 뒤에 붙는 단위 */
  readonly unit: string;
  /** 좁은 패널(비교 사례)에서 쓰는 짧은 단위 */
  readonly unitShort: string;
}

const LOW: Record<FeatureKey, FeatureLabel> = {
  E: {
    short: "관련 경험",
    description: "최근 24개월의 동아리 운영 지원 경험",
    unit: "개월",
    unitShort: "개월",
  },
  P: {
    short: "수행 기록",
    description: "최근 6회 동아리 모임 참석 횟수",
    unit: "회 / 6회",
    unitShort: "/6",
  },
  R: {
    short: "기한 이행",
    description:
      "최근 4건 공지·예약·재료 확인 등 맡은 지원 업무의 기한 내 완료",
    unit: "건 / 4건",
    unitShort: "/4",
  },
  T: {
    short: "확보 가능 시간",
    description: "배정 기간 중 주당 확보 가능한 동아리 운영 시간",
    unit: "시간 / 주",
    unitShort: "시간",
  },
};

const HIGH: Record<FeatureKey, FeatureLabel> = {
  E: {
    short: "관련 경험",
    description: "최근 24개월의 프로젝트 예산 계획·집행 점검 경험",
    unit: "개월",
    unitShort: "개월",
  },
  P: {
    short: "수행 기록",
    description:
      "최근 6건의 경비 제출 중 금액·계산·필수 증빙 수정 없이 처리된 건수",
    unit: "건 / 6건",
    unitShort: "/6",
  },
  R: {
    short: "기한 이행",
    description: "최근 4건 업무 보고의 기한 내 제출",
    unit: "건 / 4건",
    unitShort: "/4",
  },
  T: {
    short: "확보 가능 시간",
    description: "다른 업무를 제외하고 주당 확보 가능한 예산 관리 시간",
    unit: "시간 / 주",
    unitShort: "시간",
  },
};

export function featureLabels(risk: Risk): Record<FeatureKey, FeatureLabel> {
  return risk === "low" ? LOW : HIGH;
}

/** 나이는 판단식에서 제외된다. 화면에는 맥락 정보로만 표시한다(docs/02). */
export const AGE_LABEL = "나이";
/** PROFILE_LABEL 과 합쳐 "직원 ID" 로 렌더링된다. 여기에 "직원"을 다시 넣지 않는다. */
export const PROFILE_ID_LABEL = "ID";
