import type { AuthorityCueView } from "@/lib/display";

/**
 * 권위 단서 (docs/01 "Authority Cue", docs/07 S9).
 *
 * **조건 분기는 이 컴포넌트와 Explanation 안에서만 일어난다**(CLAUDE.md 규칙 1).
 * 여기서도 분기하지 않고, 서버가 배정된 쪽 문자열만 내려준다 — 배지 라벨과
 * 안내문만 달라지고 위치·크기·색·여백은 두 조건에서 완전히 동일하다.
 *
 * 공통 안내문은 두 조건 모두 같은 위치·같은 스타일로 표시한다.
 */
export function AuthorityCue({ cue, systemName }: { cue: AuthorityCueView; systemName: string }) {
  return (
    <section
      aria-label={`${systemName} 안내`}
      className="border-border flex flex-col gap-2 border p-3"
    >
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold">{systemName}</h2>
        {/* 배지: 라벨 문자열만 조건별로 다르다. 크기·색·위치 동일. */}
        <span className="border-foreground border px-2 py-0.5 text-xs font-medium">
          {cue.badgeLabel}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{cue.notice}</p>
      <p className="border-border text-muted border-t pt-2 text-sm leading-relaxed">
        {cue.commonNotice}
      </p>
    </section>
  );
}
