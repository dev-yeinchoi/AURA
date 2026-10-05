import { notFound } from "next/navigation";

import { CriteriaSummary } from "@/components/experiment/CriteriaSummary";
import { Explanation } from "@/components/experiment/Explanation";
import { ProfileCard } from "@/components/experiment/ProfileCard";
import { ScreenFrame } from "@/components/experiment/ScreenFrame";
import { VerdictTag } from "@/components/experiment/VerdictTag";
import { PLANNED_SECONDS } from "@/config/experiment";
import { criteriaSummary, selectionCriteria, VERDICT_LABEL } from "@/content/criteria";
import { featureLabels } from "@/content/features";
import { CASE_NOTICE, FI_NOTICE, SYSTEM_NAME } from "@/server/content/manipulations";
import {
  assertNoLeak,
  auraProfileViews,
  explanationView,
  featuresOfProfile,
  tauOf,
} from "@/server/experiment/ai-panel";
import {
  isPreviewEnabled,
  parsePreviewParams,
  previewOrderSeed,
} from "@/server/preview/guard";
import { PreviewToolbar } from "@/app/preview/toolbar";

/**
 * S10 — 최종 판단 (docs/07 S10).
 *
 * **6조건에서 달라지는 화면 2/2.**
 * 달라지는 것: AURA 판정·설명 재열람 영역(Explanation). 설명 조건에만 기억
 * 부담이 생기지 않도록 모든 조건에 동일한 재열람 경로를 둔다(docs/01).
 * 동일한 것: 선정 기준, 프로필 카드, 초기 판단 읽기 전용 표시, 응답 버튼,
 * 표시 순서(S8 과 같은 순서), 타이머, 버튼 위치.
 *
 * 응답 기본값 금지(규칙 8): 최종 판단은 **비어 있는 상태**로 시작한다.
 * 초기값이나 AURA 값을 자동 선택하지 않는다.
 */
export const dynamic = "force-dynamic";

export default async function PreviewS10({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isPreviewEnabled()) notFound();

  const { authority, explanation, risk, profileId, capture } = parsePreviewParams(
    await searchParams,
  );

  const tau = tauOf(risk);
  const labels = featureLabels(risk);
  const profiles = auraProfileViews(risk, previewOrderSeed(risk));
  const selected = profiles.find((p) => p.profileId === profileId) ?? profiles[0];
  if (!selected) notFound();

  const position = profiles.findIndex((p) => p.profileId === selected.profileId) + 1;
  const detail = explanationView(explanation, featuresOfProfile(selected), risk, tau);

  assertNoLeak({ profiles, detail });

  /**
   * 초기 판단은 서버에 저장된 값을 읽기 전용으로 보여준다.
   * 미리보기에는 참가자 응답이 없으므로 "적격"을 예시로 고정 표시한다.
   */
  const initialJudgmentExample = 1 as const;

  return (
    <ScreenFrame
      title="최종 판단"
      plannedSeconds={PLANNED_SECONDS.final_judgment}
      action="다음"
    >
      {capture ? null : (
        <PreviewToolbar
          screen="s10"
          authority={authority}
          explanation={explanation}
          risk={risk}
          profiles={profiles.map((p) => p.profileId)}
          selectedProfileId={selected.profileId}
        />
      )}

      {/* 기준 해상도 이상에서 3열 고정. 그 아래에서는 세로로 쌓는다(docs/06). */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[17rem_1fr_21rem]">
        <CriteriaSummary items={criteriaSummary(risk)} fullText={selectionCriteria(risk)} />

        <section aria-label="최종 판단" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">
              직원 {position} / {profiles.length}
            </h2>
            <p className="text-muted text-xs">← → 로 이동</p>
          </div>

          <ProfileCard profile={selected} labels={labels} showDescriptions />

          {/* 초기 판단: 읽기 전용. 덮어쓰지 않는다(CLAUDE.md 데이터 규칙). */}
          <div className="border-border flex items-center justify-between gap-3 border border-dashed p-3">
            <span className="text-muted text-sm">첫 번째 판단 (수정 불가)</span>
            <VerdictTag verdict={initialJudgmentExample} />
          </div>

          {/* 최종 판단: 기본 선택값 없음 (규칙 8) */}
          <fieldset className="border-border flex flex-col gap-2 border p-3">
            <legend className="px-1 text-sm font-semibold">최종 판단</legend>
            <p className="text-muted text-xs">
              선택된 항목이 없습니다. 직접 선택해 주세요.
            </p>
            <div className="flex gap-2">
              {[VERDICT_LABEL.eligible, VERDICT_LABEL.ineligible].map((label) => (
                <span
                  key={label}
                  className="border-border flex-1 border px-3 py-2 text-center text-sm"
                >
                  <span aria-hidden="true" className="text-muted mr-1.5">
                    ○
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </fieldset>
        </section>

        {/* AI 패널: S9 와 같은 위치·크기. 모든 조건에 동일한 재열람 경로. */}
        <aside className="flex flex-col gap-4">
          <div className="border-border flex items-center justify-between gap-2 border p-3">
            <span className="text-sm font-semibold">{SYSTEM_NAME} 판정</span>
            <VerdictTag verdict={selected.auraVerdict} />
          </div>

          <Explanation
            explanation={detail}
            labels={labels}
            fiNotice={FI_NOTICE}
            caseNotice={CASE_NOTICE}
          />
        </aside>
      </div>
    </ScreenFrame>
  );
}
