import { notFound } from "next/navigation";

import { AuthorityCue } from "@/components/experiment/AuthorityCue";
import { EligibleCard } from "@/components/experiment/EligibleCard";
import { Explanation } from "@/components/experiment/Explanation";
import { ScreenFrame } from "@/components/experiment/ScreenFrame";
import { VerdictTag } from "@/components/experiment/VerdictTag";
import { PLANNED_SECONDS } from "@/config/experiment";
import { FEATURE_ORDER, featureLabels } from "@/content/features";
import { CASE_NOTICE, FI_NOTICE, SYSTEM_NAME } from "@/server/content/manipulations";
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
 * 동일한 것: 레이아웃, 카드 목록, 프로필 값, 결과 패널, 타이머, 버튼 위치.
 *
 * 화면 구성 (연구자 요청):
 *  1) 권위 단서를 최상단에 크게 두어 가장 먼저 읽히게 한다.
 *  2) AURA가 **적격으로 판정한 직원만** 카드로 나열한다.
 *  3) 카드를 누르면 오른쪽 결과 패널이 그 직원으로 바뀐다.
 *
 * 주의 — 명세와의 차이:
 * docs/07 S9 와 docs/01 은 "12명 전원의 AI 판정"을 표시하도록 요구한다.
 * 부적격 판정을 감추면 docs/04 의 기회 집합이 줄어든다(RAIR 기회 8→3,
 * RSR 기회 4→2). 연구자 요청으로 적격만 표시하되 이 영향은 기록해 둔다.
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

  // AURA가 적격으로 판정한 직원만 카드로 보여 준다.
  const eligible = auraProfileViews(risk, previewOrderSeed(risk)).filter(
    (p) => p.auraVerdict === 1,
  );
  const selected = eligible.find((p) => p.profileId === profileId) ?? eligible[0];
  if (!selected) notFound();

  const cue = authorityCueView(authority);
  const detail = explanationView(explanation, featuresOfProfile(selected), risk, tau);

  // G·혼동행렬 유형이 화면 페이로드에 섞이지 않았는지 확인한다(규칙 2).
  assertNoLeak({ eligible, cue, detail });

  const selectedValues: Record<(typeof FEATURE_ORDER)[number], number> = {
    E: selected.E,
    P: selected.P,
    R: selected.R,
    T: selected.T,
  };

  const hrefFor = (id: string): string =>
    `/preview/s9?authority=${authority}&explanation=${explanation}&risk=${risk}` +
    `&profile=${id}${capture ? "&capture=1" : ""}`;

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
          profiles={eligible.map((p) => p.profileId)}
          selectedProfileId={selected.profileId}
        />
      )}

      {/* 조건별로 달라지는 영역 1 — 권위 단서. 화면에서 가장 먼저 읽힌다. */}
      <AuthorityCue cue={cue} systemName={SYSTEM_NAME} />

      {/*
        * 기준 해상도(1280px 이상)에서 2열. 그 아래(200% 확대 등)에서는 세로로
        * 쌓아 가로 스크롤로 정보가 가려지지 않게 한다(docs/06).
        * 분기 기준은 화면 너비뿐이므로 6조건에서 동일하게 적용된다.
        */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_25rem]">
        <section aria-label={`${SYSTEM_NAME}가 적격으로 판정한 직원`}>
          <div className="mb-2.5 flex items-baseline gap-2">
            <h2 className="text-base font-semibold">
              {SYSTEM_NAME}가 적격으로 판정한 직원
            </h2>
            <span className="text-muted font-mono text-sm">{eligible.length}명</span>
          </div>
          {/* 5명이 두 줄(3+2)로 들어가 세로 공간을 적게 쓴다. */}
          <ul className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
            {eligible.map((p) => (
              <li key={p.profileId}>
                <EligibleCard
                  profile={p}
                  labels={labels}
                  href={hrefFor(p.profileId)}
                  selected={p.profileId === selected.profileId}
                />
              </li>
            ))}
          </ul>
        </section>

        {/*
          * 결과 패널. 카드를 누르면 이 영역이 바뀐다.
          * **고정 높이**다 — 설명이 붙는 조건에서만 높아지면 아래 진행 버튼
          * 위치가 조건 간에 달라진다(docs/01). 세 설명 조건 중 가장 높은
          * fi_case 내용이 들어가는 높이이며, 넘치면 영역 안에서만 스크롤된다.
          */}
        <aside
          aria-label="선택한 직원 결과"
          className="bg-surface border-border-strong rounded-card flex h-[27rem] flex-col gap-2.5 border px-4 py-3.5"
        >
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="flex items-baseline gap-2 text-lg font-semibold">
                <span className="font-mono">{selected.profileId}</span>
                <span className="text-muted text-xs font-normal">
                  나이 {selected.age}
                </span>
              </h2>
              <VerdictTag verdict={selected.auraVerdict} label={`${SYSTEM_NAME} 판정`} />
            </div>

            <dl className="border-border mt-2.5 grid grid-cols-2 gap-x-5 gap-y-1 border-t pt-2.5 text-xs">
              {FEATURE_ORDER.map((key) => (
                <div key={key} className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted whitespace-nowrap">{labels[key].short}</dt>
                  <dd className="font-mono whitespace-nowrap tabular-nums">
                    {selectedValues[key]}
                    <span className="text-muted ml-0.5">{labels[key].unitShort}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 조건별로 달라지는 영역 2 — 설명 */}
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
