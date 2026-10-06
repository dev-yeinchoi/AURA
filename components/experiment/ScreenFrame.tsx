/**
 * 공통 화면 틀 (docs/07 "공통 레이아웃 원칙").
 *
 * 상단: 화면 제목(좌), 타이머(우). 하단 우측: 진행 버튼. 모든 화면 동일 위치.
 * 타이머는 **예정 시간 안내용**이다 — 0 이 되어도 화면을 막거나 자동 제출하지
 * 않으며, 경고음·빨간 점멸 같은 압박 연출을 쓰지 않는다(CLAUDE.md 규칙 9).
 * 표시 방식은 모든 조건에서 동일하다.
 */
export function ScreenFrame({
  title,
  plannedSeconds,
  action,
  children,
}: {
  title: string;
  plannedSeconds: number;
  action: string;
  children: React.ReactNode;
}) {
  const minutes = Math.floor(plannedSeconds / 60);
  const seconds = plannedSeconds % 60;
  const planned = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-3 px-8 py-3">
      <header className="border-border flex items-baseline justify-between gap-4 border-b pb-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-muted text-sm">
          예정 시간{" "}
          <span className="text-foreground font-mono tabular-nums">{planned}</span>
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-5">{children}</div>

      <footer className="border-border flex justify-end border-t pt-3">
        {/* 진행 버튼. 조건과 무관하게 같은 위치·같은 문구다. */}
        <span className="bg-foreground rounded-control px-5 py-2 text-sm font-medium text-white">
          {action}
        </span>
      </footer>
    </div>
  );
}
