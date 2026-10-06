import type { ProfileView } from "@/lib/display";
import {
  AGE_LABEL,
  FEATURE_ORDER,
  PROFILE_ID_LABEL,
  type FeatureKey,
  type FeatureLabel,
} from "@/content/features";
import { PROFILE_LABEL } from "@/content/placeholders";

/**
 * 직원 프로필 카드 (docs/02 "프로필 표시 특성", docs/07 S7·S8·S10).
 *
 * 표시 항목은 ID, 나이, E, P, R, T 뿐이고 특성 순서는 항상 E/P/R/T 다.
 * 성별은 프로필에 없다. 나이는 맥락 정보이며 판단식에서 제외된다.
 * 6조건에서 완전히 동일하게 보여야 한다.
 */
export function ProfileCard({
  profile,
  labels,
  showDescriptions = false,
}: {
  profile: ProfileView;
  labels: Record<FeatureKey, FeatureLabel>;
  showDescriptions?: boolean;
}) {
  const values: Record<FeatureKey, number> = {
    E: profile.E,
    P: profile.P,
    R: profile.R,
    T: profile.T,
  };

  return (
    <article className="bg-surface border-border rounded-card flex flex-col gap-3 border px-4 py-3.5">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">
          <span className="text-muted text-xs font-normal">
            {PROFILE_LABEL} {PROFILE_ID_LABEL}
          </span>{" "}
          {profile.profileId}
        </h3>
        <p className="text-sm">
          <span className="text-muted">{AGE_LABEL}</span>{" "}
          <span className="font-mono tabular-nums">{profile.age}</span>
        </p>
      </header>

      <dl className="flex flex-col gap-2 text-sm">
        {FEATURE_ORDER.map((key) => (
          <div key={key} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt>{labels[key].short}</dt>
              <dd className="font-mono tabular-nums">
                {values[key]}{" "}
                <span className="text-muted text-xs">{labels[key].unit}</span>
              </dd>
            </div>
            {showDescriptions ? (
              <p className="text-muted text-xs leading-snug">{labels[key].description}</p>
            ) : null}
          </div>
        ))}
      </dl>
    </article>
  );
}
