import "server-only";

import type { Authority } from "@/lib/types";

/**
 * 조작 문구 (docs/01). **server-only** 로 둔 이유:
 *
 * 규칙 6 은 조건 정보가 참가자에게 보이면 안 된다고 요구한다. 두 권위 조건의
 * 문구를 클라이언트에서 import 하면 배정받지 않은 조건의 문구까지 번들에 실려
 * 개발자 도구로 확인할 수 있다. 그래서 문구는 서버에만 두고, 화면에는 배정된
 * 쪽 문자열만 props 로 내려보낸다.
 *
 * 문구는 docs/01 원문이다. 연구 경력·정확도 수치·전문가 인증·기관 로고를
 * 붙이지 않는다.
 */

/** 권위 안내문. 두 조건 모두 같은 위치·같은 스타일로 표시한다. */
const AUTHORITY_NOTICE: Record<Authority, string> = {
  low: "이 가상 조직에서 AURA는 담당자의 판단에 참고 의견을 제공하는 지원 도구입니다. 조직의 공식 추천 시스템으로 지정되어 있지는 않습니다.",
  high: "이 가상 조직에서 AURA는 조직의 인원 배정 절차에 공식 추천 의견을 제공하도록 지정된 지원 시스템입니다.",
};

/** 배지 라벨. 크기·색·위치는 두 조건에서 동일하다. */
const AUTHORITY_BADGE: Record<Authority, string> = {
  low: "참고용 지원 시스템",
  high: "공식 지정 지원 시스템",
};

/** 양 조건 공통 안내. 동일 위치·동일 스타일로 표시한다(docs/01). */
export const AUTHORITY_COMMON_NOTICE =
  "AURA의 판단은 정확성을 보장하지 않습니다. 최종 배정 판단은 귀하가 내리며 AURA와 다른 판단을 할 수 있습니다.";

/** 기여도 표시 안내. 정확도·확신도·적격 확률·인과효과로 표기하지 않는다(docs/01). */
export const FI_NOTICE =
  "AURA가 이 직원을 적격/부적격으로 판단할 때 각 항목이 작용한 정도입니다. 정확도나 적격 확률이 아닙니다.";

/** 비교 사례 안내 (docs/01 "화면 안내 초안"). */
export const CASE_NOTICE =
  "가상 비교 사례입니다. AURA가 판단에 사용한 경험·수행 기록·기한 이행 값이 가까운 사례를 보여줍니다. 실제 직원의 성과 기록은 아닙니다.";

/** 10초 중립 대기 문구 (docs/01, docs/07 S9a). 실제 연산 시간이라고 주장하지 않는다. */
export const AI_WAIT_NOTICE = "추천 준비 중";

/** 시스템 명칭. "AI" 가 아니라 "AURA" 로 표기한다(docs/07 S9). */
export const SYSTEM_NAME = "AURA";

/** 배정된 권위 조건의 표시 문구만 추려서 돌려준다. */
export function authorityCueContent(authority: Authority): {
  badgeLabel: string;
  notice: string;
  commonNotice: string;
} {
  return {
    badgeLabel: AUTHORITY_BADGE[authority],
    notice: AUTHORITY_NOTICE[authority],
    commonNotice: AUTHORITY_COMMON_NOTICE,
  };
}
