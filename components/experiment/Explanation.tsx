import type { ExplanationView } from "@/lib/display";
import type { FeatureKey, FeatureLabel } from "@/content/features";
import { ComparisonCase } from "@/components/experiment/ComparisonCase";
import { FeatureImportance } from "@/components/experiment/FeatureImportance";

/**
 * 설명 영역 (docs/01 "Explanation", docs/07 S9).
 *
 * **조건 분기는 이 컴포넌트와 AuthorityCue 안에서만 일어난다**(CLAUDE.md 규칙 1).
 * 분기 기준은 조건명이 아니라 서버가 내려준 구조다 — 기여도가 없으면 null,
 * 사례가 없으면 null. 따라서 props 에 조건명이 남지 않는다(규칙 6).
 *
 * **높이는 이 컴포넌트가 아니라 감싸는 쪽이 고정한다.** 설명이 붙는 조건에서만
 * 영역이 늘어나면 아래쪽 진행 버튼 위치가 조건 간에 달라지기 때문이다
 * (docs/01: "사례 추가로 필요한 공간 때문에 프로필·응답 버튼 위치가 조건 간에
 * 달라지지 않도록"). 감싸는 카드가 고정 높이를 주고, 여기서는 남는 공간을
 * 채우기만 한다. 빈 영역에 "설명이 부족함" 같은 평가 유도 문구는 넣지 않는다.
 */
export function Explanation({
  explanation,
  labels,
  fiNotice,
  caseNotice,
}: {
  explanation: ExplanationView;
  labels: Record<FeatureKey, FeatureLabel>;
  fiNotice: string;
  caseNotice: string;
}) {
  return (
    <section
      aria-label="AURA 판단 설명"
      className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto"
    >
      {explanation.contributions ? (
        <FeatureImportance
          contributions={explanation.contributions}
          labels={labels}
          notice={fiNotice}
        />
      ) : null}

      {explanation.comparisonCase ? (
        <ComparisonCase
          comparisonCase={explanation.comparisonCase}
          labels={labels}
          notice={caseNotice}
        />
      ) : null}
    </section>
  );
}
