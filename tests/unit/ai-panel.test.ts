import { describe, expect, it } from "vitest";
import type { Explanation, Risk } from "@/lib/types";
import { CONTRIBUTION_AXIS_MAX } from "@/lib/display";
import {
  assertNoLeak,
  auraProfileViews,
  authorityCueView,
  explanationView,
  featuresOfProfile,
  tauOf,
} from "@/server/experiment/ai-panel";
import { loadStimuli } from "@/server/stimuli/load";
import { previewOrderSeed } from "@/server/preview/guard";

const RISKS: Risk[] = ["low", "high"];

describe("auraProfileViews", () => {
  it.each(RISKS)("12명 전원을 담고 G·유형은 담지 않는다 — risk=%s", (risk) => {
    const views = auraProfileViews(risk, previewOrderSeed(risk));
    expect(views).toHaveLength(12);
    for (const view of views) {
      expect(Object.keys(view).sort()).toEqual([
        "E",
        "P",
        "R",
        "T",
        "age",
        "auraVerdict",
        "profileId",
      ]);
      expect(view).not.toHaveProperty("G");
      expect(view).not.toHaveProperty("type");
    }
  });

  it.each(RISKS)("auraVerdict 가 자극물의 A 와 일치한다 — risk=%s", (risk) => {
    const stimuli = loadStimuli(risk);
    const byId = new Map(stimuli.profiles.map((p) => [p.profile_id, p.A]));
    for (const view of auraProfileViews(risk, previewOrderSeed(risk))) {
      expect(view.auraVerdict).toBe(byId.get(view.profileId));
    }
  });

  it.each(RISKS)("같은 시드면 같은 순서를 낸다 — risk=%s", (risk) => {
    const a = auraProfileViews(risk, previewOrderSeed(risk)).map((p) => p.profileId);
    const b = auraProfileViews(risk, previewOrderSeed(risk)).map((p) => p.profileId);
    expect(a).toEqual(b);
  });

  it("다른 시드면 순서가 달라진다", () => {
    const a = auraProfileViews("low", "seed-a").map((p) => p.profileId);
    const b = auraProfileViews("low", "seed-b").map((p) => p.profileId);
    expect(a).not.toEqual(b);
  });
});

describe("explanationView", () => {
  const risk: Risk = "low";
  const tau = tauOf(risk);
  const target = featuresOfProfile(auraProfileViews(risk, previewOrderSeed(risk))[0]!);

  it("설명 없음 조건은 둘 다 null 이다", () => {
    const view = explanationView("none", target, risk, tau);
    expect(view.contributions).toBeNull();
    expect(view.comparisonCase).toBeNull();
  });

  it("기여도 조건은 네 특성을 모두 담고 사례는 없다", () => {
    const view = explanationView("fi", target, risk, tau);
    expect(view.contributions?.map((c) => c.key)).toEqual(["E", "P", "R", "T"]);
    expect(view.comparisonCase).toBeNull();
  });

  it("기여도+사례 조건은 둘 다 담는다", () => {
    const view = explanationView("fi_case", target, risk, tau);
    expect(view.contributions).toHaveLength(4);
    expect(view.comparisonCase?.caseId).toMatch(/^LC\d{2}$/);
  });

  it("fi 와 fi_case 의 기여도 표시는 완전히 동일하다 (docs/01)", () => {
    for (const r of RISKS) {
      const t = tauOf(r);
      for (const profile of auraProfileViews(r, previewOrderSeed(r))) {
        const features = featuresOfProfile(profile);
        expect(explanationView("fi", features, r, t).contributions).toEqual(
          explanationView("fi_case", features, r, t).contributions,
        );
      }
    }
  });

  it("기여도 표시는 소수 셋째 자리 + 부호다", () => {
    const view = explanationView("fi", target, risk, tau);
    for (const c of view.contributions ?? []) {
      expect(c.display).toMatch(/^[+−]?\d\.\d{3}$/);
      if (c.value > 0) expect(c.display.startsWith("+")).toBe(true);
      if (c.value < 0) expect(c.display.startsWith("−")).toBe(true);
      if (c.value === 0) expect(c.display).toBe("0.000");
    }
  });

  it("모든 기여도가 고정 축 범위 안에 들어온다 (±7/24)", () => {
    for (const r of RISKS) {
      const t = tauOf(r);
      for (const profile of auraProfileViews(r, previewOrderSeed(r))) {
        const view = explanationView("fi", featuresOfProfile(profile), r, t);
        for (const c of view.contributions ?? []) {
          expect(Math.abs(c.value)).toBeLessThanOrEqual(CONTRIBUTION_AXIS_MAX + 1e-12);
        }
      }
    }
  });

  it("사례는 네 특성과 판정만 담는다 (G·실제 성과 없음)", () => {
    const view = explanationView("fi_case", target, risk, tau);
    expect(Object.keys(view.comparisonCase ?? {}).sort()).toEqual([
      "E",
      "P",
      "R",
      "T",
      "caseId",
      "verdict",
    ]);
  });

  it("어떤 조건의 페이로드에도 조건명이 남지 않는다 (규칙 6)", () => {
    const names = ["none", "fi", "fi_case", "low", "high"];
    for (const explanation of ["none", "fi", "fi_case"] as Explanation[]) {
      const serialized = JSON.stringify(explanationView(explanation, target, risk, tau));
      for (const name of names) {
        expect(serialized).not.toContain(`"${name}"`);
      }
    }
  });
});

describe("authorityCueView", () => {
  it("배정된 쪽 문구만 담는다 — 다른 조건의 문구가 섞이지 않는다", () => {
    const low = authorityCueView("low");
    const high = authorityCueView("high");

    expect(low.badgeLabel).toBe("참고용 지원 시스템");
    expect(high.badgeLabel).toBe("공식 지정 지원 시스템");
    expect(low.notice).not.toBe(high.notice);
    expect(JSON.stringify(low)).not.toContain(high.badgeLabel);
    expect(JSON.stringify(high)).not.toContain(low.badgeLabel);
  });

  it("공통 안내문은 두 조건에서 동일하다 (docs/01)", () => {
    expect(authorityCueView("low").commonNotice).toBe(
      authorityCueView("high").commonNotice,
    );
    expect(authorityCueView("low").commonNotice).toContain(
      "정확성을 보장하지 않습니다",
    );
  });

  it("권위 문구에 정확도 수치·기관 인증을 넣지 않는다 (docs/01)", () => {
    for (const authority of ["low", "high"] as const) {
      const cue = authorityCueView(authority);
      expect(cue.notice).not.toMatch(/\d+\s*%/);
      expect(cue.notice).not.toMatch(/정부|인증|전문가|연구 경력/);
    }
  });
});

describe("assertNoLeak", () => {
  it("정상 페이로드는 통과한다", () => {
    const risk: Risk = "high";
    const t = tauOf(risk);
    const profiles = auraProfileViews(risk, previewOrderSeed(risk));
    const detail = explanationView("fi_case", featuresOfProfile(profiles[0]!), risk, t);
    expect(() => assertNoLeak({ profiles, detail })).not.toThrow();
  });

  it("G 키가 섞이면 예외", () => {
    expect(() => assertNoLeak({ profiles: [{ profileId: "L01", G: 1 }] })).toThrow(/G/);
  });

  it("type 키가 섞이면 예외", () => {
    expect(() => assertNoLeak({ type: "TP" })).toThrow(/type/);
  });

  it("혼동행렬 유형 문자열이 섞이면 예외", () => {
    for (const value of ["TP", "FP", "FN", "TN"]) {
      expect(() => assertNoLeak({ label: value })).toThrow(/혼동행렬/);
    }
  });

  it("자극물 원본을 넘기면 예외 (안전망이 실제로 잡는다)", () => {
    expect(() => assertNoLeak(loadStimuli("low"))).toThrow();
  });
});
