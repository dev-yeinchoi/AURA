import Link from "next/link";

import type { AuraProfileView } from "@/lib/display";
import {
  AGE_LABEL,
  FEATURE_ORDER,
  PROFILE_ID_LABEL,
  type FeatureKey,
  type FeatureLabel,
} from "@/content/features";
import { PROFILE_LABEL } from "@/content/placeholders";
import { VerdictTag } from "@/components/experiment/VerdictTag";

/**
 * AURA가 적격으로 판정한 직원 카드 (docs/07 S9).
 *
 * 누르면 오른쪽 결과 패널이 해당 직원으로 바뀐다.
 * 카드 내용·크기·간격은 6조건에서 모두 동일하다.
 */
export function EligibleCard({
  profile,
  labels,
  href,
  selected,
}: {
  profile: AuraProfileView;
  labels: Record<FeatureKey, FeatureLabel>;
  href: string;
  selected: boolean;
}) {
  const values: Record<FeatureKey, number> = {
    E: profile.E,
    P: profile.P,
    R: profile.R,
    T: profile.T,
  };

  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={[
        "bg-surface rounded-card flex flex-col gap-2.5 border px-4 py-3 no-underline",
        selected ? "border-foreground border-2" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-baseline gap-1.5 text-base font-semibold">
          <span className="text-muted text-[11px] font-normal tracking-wide">
            {PROFILE_LABEL} {PROFILE_ID_LABEL}
          </span>
          <span className="font-mono">{profile.profileId}</span>
        </h3>
        <p className="text-muted text-xs">
          {AGE_LABEL} <span className="text-foreground font-mono">{profile.age}</span>
        </p>
      </div>

      {/* 특성 라벨은 판단 근거이므로 줄이거나 자르지 않는다. 순서는 항상 E/P/R/T. */}
      <dl className="flex flex-col gap-0.5 text-xs">
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

      <div className="border-border flex justify-end border-t pt-2">
        <VerdictTag verdict={profile.auraVerdict} />
      </div>
    </Link>
  );
}
