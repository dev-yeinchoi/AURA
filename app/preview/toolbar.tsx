import Link from "next/link";

import type { Authority, Explanation, Risk } from "@/lib/types";

/**
 * 미리보기 전환 막대 — **연구자 전용. 참가자 화면에는 들어가지 않는다.**
 *
 * 캡처 시에는 이 막대를 제외하고 그 아래 영역만 잘라서 쓴다.
 * 조건명이 보이는 유일한 곳이며, `/preview` 경로 자체가 참가자 흐름과 분리되어 있다.
 */
export function PreviewToolbar({
  screen,
  authority,
  explanation,
  risk,
  profiles,
  selectedProfileId,
}: {
  screen: "s9" | "s10";
  authority: Authority;
  explanation: Explanation;
  risk: Risk;
  profiles: readonly string[];
  selectedProfileId: string;
}) {
  const href = (next: {
    screen?: "s9" | "s10";
    authority?: Authority;
    explanation?: Explanation;
    risk?: Risk;
    profile?: string;
  }): string => {
    const params = new URLSearchParams({
      authority: next.authority ?? authority,
      explanation: next.explanation ?? explanation,
      risk: next.risk ?? risk,
      profile: next.profile ?? selectedProfileId,
    });
    return `/preview/${next.screen ?? screen}?${params.toString()}`;
  };

  return (
    <div
      data-preview-toolbar
      className="border-border flex flex-wrap items-center gap-x-5 gap-y-2 border border-dashed bg-[#f6f6f6] px-3 py-2 text-xs print:hidden"
    >
      <span className="font-semibold">연구자 미리보기</span>

      <Row label="화면">
        <Opt active={screen === "s9"} href={href({ screen: "s9" })}>
          S9 AI 제시
        </Opt>
        <Opt active={screen === "s10"} href={href({ screen: "s10" })}>
          S10 최종 판단
        </Opt>
      </Row>

      <Row label="authority">
        <Opt active={authority === "low"} href={href({ authority: "low" })}>
          low
        </Opt>
        <Opt active={authority === "high"} href={href({ authority: "high" })}>
          high
        </Opt>
      </Row>

      <Row label="explanation">
        {(["none", "fi", "fi_case"] as const).map((value) => (
          <Opt key={value} active={explanation === value} href={href({ explanation: value })}>
            {value}
          </Opt>
        ))}
      </Row>

      <Row label="risk">
        <Opt active={risk === "low"} href={href({ risk: "low" })}>
          low
        </Opt>
        <Opt active={risk === "high"} href={href({ risk: "high" })}>
          high
        </Opt>
      </Row>

      <Row label="직원">
        {profiles.map((id) => (
          <Opt key={id} active={id === selectedProfileId} href={href({ profile: id })}>
            {id}
          </Opt>
        ))}
      </Row>

      <Link
        href={`${href({})}&capture=1`}
        className="ml-auto underline"
        title="이 막대를 숨기고 참가자가 보는 화면만 표시합니다"
      >
        캡처 모드
      </Link>
      <Link href="/preview" className="underline">
        목록
      </Link>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted">{label}</span>
      {children}
    </span>
  );
}

function Opt({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "border px-1.5 py-0.5 font-mono",
        active ? "border-foreground bg-foreground text-white" : "border-border",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
