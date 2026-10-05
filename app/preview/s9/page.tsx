import { notFound } from "next/navigation";

import { AuthorityCue } from "@/components/experiment/AuthorityCue";
import { Explanation } from "@/components/experiment/Explanation";
import { ProfileCard } from "@/components/experiment/ProfileCard";
import { ScreenFrame } from "@/components/experiment/ScreenFrame";
import { VerdictTag } from "@/components/experiment/VerdictTag";
import { PLANNED_SECONDS } from "@/config/experiment";
import { featureLabels } from "@/content/features";
import {
  CASE_NOTICE,
  FI_NOTICE,
  SYSTEM_NAME,
} from "@/server/content/manipulations";
import {
  assertNoLeak,
  auraProfileViews,
  authorityCueView,
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
 * S9 — AURA 추천 정보 확인 (docs/07 S9, docs/01).
 *
 * **6조건에서 달라지는 화면 1/2.**
 * 달라지는 것: 권위 배지·안내문(AuthorityCue), 설명 영역(Explanation).
 * 동일한 것: 레이아웃, 12명 목록, 프로필 카드, AURA 판정 표시, 타이머, 버튼 위치.
 *
 * 서버 컴포넌트다. 배정되지 않은 조건의 문구는 클라이언트로 내려가지 않는다.
 */
export const dynamic = "force-dynamic";

export default async function PreviewS9({
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

  const cue = authorityCueView(authority);
  const detail = explanationView(explanation, featuresOfProfile(selected), risk, tau);

  // G·혼동행렬 유형이 화면 페이로드에 섞이지 않았는지 확인한다(규칙 2).
  assertNoLeak({ profiles, cue, detail });

  return (
    <ScreenFrame
      title="AURA 추천 정보 확인"
      plannedSeconds={PLANNED_SECONDS.ai_reveal}
      action="다음"
    >
      {capture ? null : (
        <PreviewToolbar
          screen="s9"
          authority={authority}
          explanation={explanation}
          risk={risk}
          profiles={profiles.map((p) => p.profileId)}
          selectedProfileId={selected.profileId}
        />
      )}

      {/* 조건별로 달라지는 영역 1 — 권위 단서 */}
      <AuthorityCue cue={cue} systemName={SYSTEM_NAME} />

      {/*
        * 기준 해상도(1280px 이상)에서 3열 고정 — 전체가 1280×720 안에 들어온다.
        * 그 아래(200% 확대 등)에서는 세로로 쌓아 가로 스크롤로 정보가 가려지지
        * 않게 한다(docs/06 "200% 확대에서 정보 누락·가림 점검").
        * 분기 기준은 화면 너비뿐이므로 6조건에서 동일하게 적용된다.
        */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_16rem_21rem]">
        <section aria-label="직원별 AURA 판정" className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">
            직원 12명 전원의 {SYSTEM_NAME} 판정
          </h2>
          <ul className="grid grid-cols-2 gap-1.5">
            {profiles.map((p) => (
              <li
                key={p.profileId}
                className={[
                  "flex items-center justify-between gap-2 border px-2 py-1.5 text-sm",
                  p.profileId === selected.profileId
                    ? "border-foreground border-2"
                    : "border-border",
                ].join(" ")}
              >
                <span className="font-mono">{p.profileId}</span>
                <VerdictTag verdict={p.auraVerdict} />
              </li>
            ))}
          </ul>
        </section>

        {/* 선택한 직원의 프로필. 조건과 무관하게 동일하다. */}
        <section aria-label="선택한 직원" className="flex flex-col gap-3">
          <ProfileCard profile={selected} labels={labels} />
          <div className="border-border flex items-center justify-between gap-2 border p-3">
            <span className="text-sm font-semibold">{SYSTEM_NAME} 판정</span>
            <VerdictTag verdict={selected.auraVerdict} />
          </div>
        </section>

        {/* AI 패널: 위치·크기를 조건과 무관하게 고정한다(docs/07).
            조건별로 달라지는 영역 2 — 설명 */}
        <aside>
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
