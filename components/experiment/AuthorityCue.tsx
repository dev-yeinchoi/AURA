import type { AuthorityCueView } from "@/lib/display";

/**
 * 권위 단서 (docs/01 "Authority Cue", docs/07 S9).
 *
 * **조건 분기는 이 컴포넌트와 Explanation 안에서만 일어난다**(CLAUDE.md 규칙 1).
 * 여기서도 분기하지 않고, 서버가 배정된 쪽 문자열만 내려준다 — 배지 라벨과
 * 안내문만 달라지고 위치·크기·색·여백은 두 조건에서 완전히 동일하다.
 *
 * 화면에서 가장 먼저 읽히도록 최상단에 두고, 타이포 대비(시스템 이름 큰 글자 +
 * 배지)로 시선을 잡는다. 강조는 **구조와 크기**로만 주고 색을 더하지 않는다 —
 * 두 권위 조건에서 색·크기가 같아야 하기 때문이다.
 */
export function AuthorityCue({
  cue,
  systemName,
}: {
  cue: AuthorityCueView;
  systemName: string;
}) {
  return (
    <section
      aria-label={`${systemName} 안내`}
      className="bg-surface border-border-strong rounded-card border px-6 py-3.5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-2xl leading-none font-semibold tracking-tight">
          {systemName}
        </h2>
        {/* 배지: 라벨 문자열만 조건별로 다르다. 크기·색·위치 동일. */}
        <span className="border-foreground rounded-tag border px-2.5 py-1 text-xs font-semibold tracking-wide">
          {cue.badgeLabel}
        </span>
      </div>

      <p className="mt-2.5 max-w-[92ch] text-[15px] leading-relaxed">
        {cue.notice}
      </p>

      <p className="border-border text-muted mt-2.5 max-w-[92ch] border-t pt-2 text-sm leading-relaxed">
        {cue.commonNotice}
      </p>
    </section>
  );
}
