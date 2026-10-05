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
 * **영역 높이는 조건 간 고정**한다(docs/01, docs/07 S9). 설명이 없는 조건에서
 * 레이아웃이 위로 당겨지면 프로필·버튼 위치가 조건 간에 달라진다. 빈 영역에
 * "설명이 부족함" 같은 평가 유도 문구는 넣지 않는다.
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
      /*
       * **고정 높이**다. min-h 로 두면 사례가 붙는 조건에서만 영역이 늘어나
       * 아래쪽 진행 버튼 위치가 조건 간에 달라진다(docs/01: "사례 추가로 필요한
       * 공간 때문에 프로필·응답 버튼 위치가 조건 간에 달라지지 않도록").
       * 값은 세 조건 중 가장 높은 fi_case 내용이 들어가는 높이이며,
       * 1280×720 기준 화면 안에 전체가 들어오도록 맞췄다.
       * 200% 확대처럼 내용이 넘치는 경우에는 영역 안에서만 스크롤된다.
       */
      className="border-border flex h-[22.5rem] flex-col gap-2 overflow-y-auto border p-3"
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
