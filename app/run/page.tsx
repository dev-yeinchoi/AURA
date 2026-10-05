/**
 * 참가자 화면 진입점. 서버 상태 머신이 단계를 결정한다(docs/06 "상태와 복구").
 * 화면 구현은 계획 01 범위 밖이므로 지금은 빈 화면이다.
 */
export default function RunPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-2 p-8">
      <h1 className="text-lg font-semibold">준비 중</h1>
      <p className="text-muted text-sm">
        안내를 기다려 주세요.
      </p>
    </main>
  );
}
