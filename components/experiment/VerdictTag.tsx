import type { DisplayVerdict } from "@/lib/display";
import { VERDICT_LABEL } from "@/content/criteria";

/**
 * 적격/부적격 표시.
 *
 * 색만으로 구별하지 않는다(CLAUDE.md 디자인). 문구와 기호를 함께 쓰고,
 * 테두리 두께로도 구분한다. 녹색·빨강 같은 가치 함축 색은 쓰지 않는다.
 * 크기·위치는 모든 조건에서 동일하다.
 */
export function VerdictTag({
  verdict,
  label,
}: {
  verdict: DisplayVerdict;
  label?: string;
}) {
  const eligible = verdict === 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {label ? <span className="text-muted">{label}</span> : null}
      <span
        className={[
          "rounded-tag inline-flex items-center gap-1 px-2 py-0.5 text-sm leading-tight",
          eligible
            ? "border-foreground border font-semibold"
            : "border-border-strong text-muted border border-dashed",
        ].join(" ")}
      >
        <span aria-hidden="true">{eligible ? "●" : "○"}</span>
        {eligible ? VERDICT_LABEL.eligible : VERDICT_LABEL.ineligible}
      </span>
    </span>
  );
}
