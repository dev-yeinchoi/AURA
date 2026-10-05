/**
 * 루트는 안내만 둔다. 참가자는 연구자가 띄운 /run 으로 진입한다.
 * URL 에 식별자·단계·조건이 드러나지 않아야 한다(계획 D3, 규칙 6).
 */
export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-2 p-8">
      <h1 className="text-lg font-semibold">AURA</h1>
      <p className="text-muted text-sm">연구용 판단 과제 플랫폼입니다.</p>
    </main>
  );
}
