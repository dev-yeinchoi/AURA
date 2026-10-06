import type { ComparisonCaseView } from "@/lib/display";
import { FEATURE_ORDER, type FeatureKey, type FeatureLabel } from "@/content/features";
import { VerdictTag } from "@/components/experiment/VerdictTag";

/**
 * 가상 비교 사례 (docs/01 "fi_case").
 *
 * 네 특성 값 + 해당 사례에 A 를 적용한 판정만 보여준다.
 * G 나 실제 성과는 표시하지 않는다.
 */
export function ComparisonCase({
  comparisonCase,
  labels,
  notice,
}: {
  comparisonCase: ComparisonCaseView;
  labels: Record<FeatureKey, FeatureLabel>;
  notice: string;
}) {
  const values: Record<FeatureKey, number> = {
    E: comparisonCase.E,
    P: comparisonCase.P,
    R: comparisonCase.R,
    T: comparisonCase.T,
  };

  return (
    <div className="bg-surface-sunken border-border rounded-control flex flex-col gap-1.5 border p-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold">비교 사례 {comparisonCase.caseId}</h4>
        <VerdictTag verdict={comparisonCase.verdict} label="AURA 판정" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {FEATURE_ORDER.map((key) => (
          <div key={key} className="flex items-baseline justify-between gap-2">
            <dt className="text-muted whitespace-nowrap">{labels[key].short}</dt>
            <dd className="font-mono whitespace-nowrap tabular-nums">
              {values[key]}
              <span className="text-muted ml-0.5">{labels[key].unitShort}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-muted text-xs leading-snug">{notice}</p>
    </div>
  );
}
