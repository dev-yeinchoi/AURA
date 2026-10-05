/**
 * 화면에 내려보내는 표시용 타입.
 *
 * 런타임 값에 조건명(low/high/none/fi/fi_case)을 담지 않는다(CLAUDE.md 규칙 6).
 * 설명 유형은 이름 대신 **구조**로 나타낸다 — 표시할 내용이 있으면 값이 있고
 * 없으면 null 이다. 따라서 props 나 RSC 페이로드에 조건명이 남지 않는다.
 *
 * G 와 혼동행렬 유형(TP/FP/FN/TN)은 이 타입들에 **존재하지 않는다**(규칙 2).
 */

/** 이진 판정 표시값. 1 = 적격, 0 = 부적격. */
export type DisplayVerdict = 0 | 1;

/** 기여도 한 항목. docs/01: 네 특성을 모두 표시하고, 축 범위는 모든 조건에서 같다. */
export interface ContributionView {
  readonly key: "E" | "P" | "R" | "T";
  /** 표시용 근사값. 부호를 포함한다. */
  readonly value: number;
  /** 소수 셋째 자리 문자열. 부호를 반드시 포함한다(색만으로 구분 금지). */
  readonly display: string;
  /** 정확한 유리수 문자열. 검증·기록용. */
  readonly exact: string;
}

/** 프로필 표시값. age 는 표시 전용이며 어떤 계산에도 쓰이지 않는다. */
export interface ProfileView {
  readonly profileId: string;
  readonly age: number;
  readonly E: number;
  readonly P: number;
  readonly R: number;
  readonly T: number;
}

/** 비교 사례 표시값. 네 특성 + A 판정만. G·실제 성과는 없다(docs/01). */
export interface ComparisonCaseView {
  readonly caseId: string;
  readonly E: number;
  readonly P: number;
  readonly R: number;
  readonly T: number;
  readonly verdict: DisplayVerdict;
}

/**
 * 배정된 설명. 조건명을 담지 않는다.
 * - 설명 없음  → contributions: null, comparisonCase: null
 * - 기여도     → contributions 있음, comparisonCase: null
 * - 기여도+사례 → 둘 다 있음
 */
export interface ExplanationView {
  readonly contributions: readonly ContributionView[] | null;
  readonly comparisonCase: ComparisonCaseView | null;
}

/** 권위 단서 표시 문구. 배정된 쪽 문자열만 담는다. */
export interface AuthorityCueView {
  readonly badgeLabel: string;
  readonly notice: string;
  readonly commonNotice: string;
}

/** AURA 판정이 붙은 프로필. 초기 판단 잠금 이후에만 내려보낸다(규칙 2). */
export interface AuraProfileView extends ProfileView {
  readonly auraVerdict: DisplayVerdict;
}

/** 기여도 막대의 고정 축 범위. docs/01 표의 최대 |φ| = 7/24. */
export const CONTRIBUTION_AXIS_MAX = 7 / 24;
