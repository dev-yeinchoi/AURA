import "server-only";

import type { Authority, Explanation, Risk } from "@/lib/types";

/**
 * IRB 서류용 화면 미리보기 (연구자 전용).
 *
 * 이 경로는 조건을 URL 로 직접 지정해 6조건 화면을 캡처하기 위한 것이다.
 * 참가자 흐름(`/run`)과 완전히 분리되어 있고, 참가자에게는 도달 경로가 없다.
 * URL 에 조건명이 들어가므로 **참가자 환경에서는 반드시 꺼야 한다**(규칙 6).
 *
 * 기본값은 차단이다. 개발 환경이거나 `PREVIEW_ENABLED=1` 일 때만 열린다.
 */
export function isPreviewEnabled(): boolean {
  if (process.env.PREVIEW_ENABLED === "1") return true;
  return process.env.NODE_ENV !== "production";
}

const AUTHORITIES: readonly Authority[] = ["low", "high"];
const EXPLANATIONS: readonly Explanation[] = ["none", "fi", "fi_case"];
const RISKS: readonly Risk[] = ["low", "high"];

export const PREVIEW_AUTHORITIES = AUTHORITIES;
export const PREVIEW_EXPLANATIONS = EXPLANATIONS;
export const PREVIEW_RISKS = RISKS;

/** 6개 참가자 간 조건. docs/01 표 순서대로. */
export const PREVIEW_CONDITIONS: ReadonlyArray<{
  authority: Authority;
  explanation: Explanation;
  /** docs/01 의 condition 열 (연구자용 라벨 — 참가자 화면에는 쓰지 않는다) */
  label: string;
}> = [
  { authority: "low", explanation: "none", label: "L-N" },
  { authority: "low", explanation: "fi", label: "L-F" },
  { authority: "low", explanation: "fi_case", label: "L-FC" },
  { authority: "high", explanation: "none", label: "H-N" },
  { authority: "high", explanation: "fi", label: "H-F" },
  { authority: "high", explanation: "fi_case", label: "H-FC" },
];

function parseOne<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export interface PreviewParams {
  authority: Authority;
  explanation: Explanation;
  risk: Risk;
  /** 상세 패널에 보일 직원. 없으면 첫 번째. */
  profileId: string | undefined;
  /**
   * 캡처 모드. 연구자 전환 막대를 숨겨 참가자가 보는 화면만 남긴다.
   * IRB 서류에 넣을 이미지는 이 모드로 찍는다.
   */
  capture: boolean;
}

export function parsePreviewParams(
  params: Record<string, string | string[] | undefined>,
): PreviewParams {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    authority: parseOne(one("authority"), AUTHORITIES, "low"),
    explanation: parseOne(one("explanation"), EXPLANATIONS, "none"),
    risk: parseOne(one("risk"), RISKS, "low"),
    profileId: one("profile"),
    capture: one("capture") === "1",
  };
}

/**
 * 미리보기용 고정 표시 순서 시드.
 *
 * 실제 실험에서는 참가자×라운드별 시드를 DB 에서 받는다. 캡처본이 매번 달라지면
 * IRB 서류 대조가 어려우므로 미리보기에서만 고정값을 쓴다.
 */
export function previewOrderSeed(risk: Risk): string {
  return `irb-preview:${risk}`;
}
