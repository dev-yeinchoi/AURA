import {
  AI_REVEAL_DELAY_SECONDS,
  CELLS_PER_BLOCK,
  PROFILES_PER_ROUND,
  ROUNDS,
  VERSIONS,
  VIEWPORT_BASELINE,
} from "@/config/experiment";
import { envPresence } from "@/server/env";

/**
 * 기반 세팅 상태 확인 화면 (계획 01 §1 "상태 확인 페이지").
 *
 * 환경변수는 **설정 여부만** 보여준다. 값은 렌더링하지 않는다.
 * 조건·자극물·정답은 표시하지 않는다(규칙 2, 6).
 */
export const dynamic = "force-dynamic";

export default function StatusPage() {
  const env = envPresence();

  const rows: Array<[string, string]> = [
    ["Node", process.version],
    ["명세 리비전", VERSIONS.spec],
    ["자극물 버전", VERSIONS.stimulus],
    ["라운드 수", String(ROUNDS)],
    ["라운드당 프로필", String(PROFILES_PER_ROUND)],
    ["배정 블록 크기", String(CELLS_PER_BLOCK)],
    ["AI 중립 대기", `${AI_REVEAL_DELAY_SECONDS}초`],
    ["기준 해상도", `${VIEWPORT_BASELINE.width}×${VIEWPORT_BASELINE.height}`],
  ];

  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-lg font-semibold">상태 확인</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">설정</h2>
        <dl className="border-border divide-border divide-y border-t border-b text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-1.5">
              <dt className="text-muted">{label}</dt>
              <dd className="font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">환경변수</h2>
        <dl className="border-border divide-border divide-y border-t border-b text-sm">
          {Object.entries(env).map(([key, present]) => (
            <div key={key} className="flex justify-between gap-4 py-1.5">
              <dt className="text-muted font-mono">{key}</dt>
              <dd>{present ? "설정됨" : "없음"}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted text-xs">
          값은 표시하지 않습니다. 설정 여부만 확인합니다.
        </p>
      </section>
    </main>
  );
}
