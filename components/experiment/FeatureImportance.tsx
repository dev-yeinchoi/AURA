import { CONTRIBUTION_AXIS_MAX, type ContributionView } from "@/lib/display";
import { type FeatureKey, type FeatureLabel } from "@/content/features";

/**
 * 기여도 표시 (docs/01 "fi").
 *
 * - 네 특성을 **모두** 표시한다. 0 인 T 를 빼거나 상위 3개만 고르지 않는다.
 * - 축 범위는 모든 조건·프로필에서 동일하다(±7/24).
 * - 특성 순서는 항상 E, P, R, T.
 * - 양수/음수를 색뿐 아니라 **부호와 막대 방향**으로도 구별한다.
 * - 단위는 "이진 적격 출력에 대한 기여도"다. 정확도·확신도·적격 확률·인과효과로
 *   표기하지 않는다.
 */
export function FeatureImportance({
  contributions,
  labels,
  notice,
}: {
  contributions: readonly ContributionView[];
  labels: Record<FeatureKey, FeatureLabel>;
  notice: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted text-xs leading-snug">{notice}</p>

      <table className="w-full text-sm">
        <caption className="sr-only">
          각 항목이 AURA 판단에 작용한 정도. 축 범위는 모든 화면에서 동일합니다.
        </caption>
        <thead>
          <tr className="text-muted text-xs">
            <th scope="col" className="w-28 pb-1 text-left font-normal">
              항목
            </th>
            <th scope="col" className="pb-1 text-left font-normal">
              작용 정도
            </th>
            <th scope="col" className="w-16 pb-1 text-right font-normal">
              값
            </th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => (
            <ContributionRow key={c.key} contribution={c} label={labels[c.key].short} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContributionRow({
  contribution,
  label,
}: {
  contribution: ContributionView;
  label: string;
}) {
  const ratio = Math.min(Math.abs(contribution.value) / CONTRIBUTION_AXIS_MAX, 1);
  const width = `${(ratio * 50).toFixed(2)}%`;
  const positive = contribution.value > 0;
  const negative = contribution.value < 0;

  return (
    <tr>
      <th scope="row" className="py-0.5 text-left font-normal">
        {label}
      </th>
      <td className="py-0.5">
        {/* 중앙 0 축. 양수는 오른쪽, 음수는 왼쪽으로 뻗는다. */}
        <div className="relative h-4" role="presentation">
          <div className="border-border absolute inset-y-0 left-1/2 border-l" />
          {negative ? (
            <div
              className="border-foreground absolute inset-y-0.5 border-2 border-dashed"
              style={{ right: "50%", width }}
            />
          ) : null}
          {positive ? (
            <div
              className="bg-foreground absolute inset-y-0.5"
              style={{ left: "50%", width }}
            />
          ) : null}
        </div>
      </td>
      <td className="py-0.5 text-right font-mono text-xs tabular-nums">
        {contribution.display}
      </td>
    </tr>
  );
}
