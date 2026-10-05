import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PREVIEW_CONDITIONS,
  PREVIEW_RISKS,
  isPreviewEnabled,
} from "@/server/preview/guard";

/**
 * IRB 서류용 캡처 목록 — 연구자 전용.
 *
 * 조건 때문에 달라지는 화면은 S9(AI 제시)과 S10(최종 판단) 두 개다.
 * 6조건 × 2맥락 = 화면당 12장, 합계 24장이다(docs/06 수용 기준 "6조건 × 2맥락").
 */
export const dynamic = "force-dynamic";

const SCREENS = [
  {
    id: "s9",
    title: "S9 AURA 추천 정보 확인",
    note: "권위 배지·안내문 + 설명 영역",
    distinct: "6조건 모두 다름 (맥락별 6장, 합계 12장)",
  },
  {
    id: "s10",
    title: "S10 최종 판단",
    note: "AURA 판정·설명 재열람 영역",
    distinct:
      "설명 3유형만 다름. 권위 단서는 docs/01 상 AI 제시 단계에서만 표시하므로 authority low/high 화면이 동일하다 (맥락별 3장, 합계 6장)",
  },
] as const;

export default function PreviewIndex() {
  if (!isPreviewEnabled()) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">IRB 캡처용 화면 목록</h1>
        <p className="text-muted text-sm leading-relaxed">
          참가자 간 조건(authority × explanation) 때문에 화면이 달라지는 지점은 두
          곳입니다. 아래 표의 링크를 열어 캡처하세요. 상단 &ldquo;연구자
          미리보기&rdquo; 막대는 캡처에서 제외합니다.
        </p>
      </header>

      {SCREENS.map((screen) => (
        <section key={screen.id} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">{screen.title}</h2>
            <p className="text-muted text-sm">달라지는 영역: {screen.note}</p>
            <p className="text-muted text-sm">실제 서로 다른 캡처: {screen.distinct}</p>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border text-muted border-b text-left text-xs">
                <th scope="col" className="py-1.5 pr-3 font-normal">
                  조건
                </th>
                <th scope="col" className="py-1.5 pr-3 font-normal">
                  authority
                </th>
                <th scope="col" className="py-1.5 pr-3 font-normal">
                  explanation
                </th>
                {PREVIEW_RISKS.map((risk) => (
                  <th key={risk} scope="col" className="py-1.5 pr-3 font-normal">
                    risk = {risk}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PREVIEW_CONDITIONS.map((condition) => (
                <tr key={condition.label} className="border-border border-b">
                  <td className="py-1.5 pr-3 font-mono">{condition.label}</td>
                  <td className="text-muted py-1.5 pr-3 font-mono">
                    {condition.authority}
                  </td>
                  <td className="text-muted py-1.5 pr-3 font-mono">
                    {condition.explanation}
                  </td>
                  {PREVIEW_RISKS.map((risk) => (
                    <td key={risk} className="py-1.5 pr-3">
                      <Link
                        className="underline"
                        href={`/preview/${screen.id}?authority=${condition.authority}&explanation=${condition.explanation}&risk=${risk}`}
                      >
                        열기
                      </Link>
                      <span className="text-muted mx-1.5">/</span>
                      <Link
                        className="underline"
                        href={`/preview/${screen.id}?authority=${condition.authority}&explanation=${condition.explanation}&risk=${risk}&capture=1`}
                      >
                        캡처
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="border-border flex flex-col gap-2 border-t pt-4">
        <h2 className="text-sm font-semibold">캡처 안내</h2>
        <ul className="text-muted flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed">
          <li>
            &ldquo;캡처&rdquo; 링크는 연구자 전환 막대를 숨기고 참가자가 보는
            화면만 보여 줍니다. IRB 서류에는 이 화면을 넣으세요.
          </li>
          <li>기준 해상도 1280×720 이상에서 캡처합니다(docs/06).</li>
          <li>
            설명 영역의 높이는 세 설명 조건에서 동일하게 예약되어 있습니다. none
            조건의 빈 영역은 의도된 것입니다(docs/01).
          </li>
          <li>
            프로필 표시 순서는 미리보기 전용 고정 시드를 쓰므로 캡처본끼리 순서가
            같습니다. 실제 실험에서는 참가자×라운드별 시드로 섞입니다.
          </li>
          <li>
            S9·S10 외의 화면(S0~S8, S11~S13)은 6조건에서 동일하므로 조건별 캡처가
            필요하지 않습니다.
          </li>
          <li>
            <code>pnpm capture:irb</code> 로 24장을 한 번에 저장할 수 있습니다.
          </li>
        </ul>
      </section>
    </main>
  );
}
