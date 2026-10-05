import "server-only";

import { createHash } from "node:crypto";

/**
 * 프로필 표시 순서 무작위화 (계획 01 §2 `order.ts`, docs/02·docs/06).
 *
 * 순서는 참가자 × 라운드별 시드로 섞고, 그 라운드의 모든 단계에서 같은 순서를
 * 유지한다. 시드는 DB 에 저장되며, 재접속·새로고침 시 같은 순서를 복원해야 하므로
 * PRNG 는 플랫폼·버전에 무관하게 **완전히 결정적**이어야 한다.
 *
 * 알고리즘(바꾸면 기존 참가자의 순서 복원이 깨진다):
 *  1. 시드 문자열을 UTF-8 로 보고 SHA-256 해시
 *  2. 해시 앞 8바이트를 빅엔디언 uint64 로 읽어 SplitMix64 의 초기 상태로 쓴다
 *  3. SplitMix64 로 난수를 뽑고, 모듈로 편향을 제거한 뒤
 *  4. 내림차순 Fisher–Yates 로 섞는다
 */

const MASK64 = (1n << 64n) - 1n;
const GOLDEN_GAMMA = 0x9e3779b97f4a7c15n;
const MIX1 = 0xbf58476d1ce4e5b9n;
const MIX2 = 0x94d049bb133111ebn;

/** 시드 문자열 → SplitMix64 초기 상태. */
function seedState(seed: string): bigint {
  const digest = createHash("sha256").update(seed, "utf8").digest();
  let state = 0n;
  for (let i = 0; i < 8; i += 1) {
    state = (state << 8n) | BigInt(digest[i] ?? 0);
  }
  return state;
}

export interface Prng {
  /** 다음 64비트 난수. */
  nextUint64(): bigint;
  /** 0 이상 bound 미만의 균일 정수. 모듈로 편향을 제거한다. */
  nextBelow(bound: number): number;
}

/** 시드 문자열로 결정적 PRNG 를 만든다. */
export function createPrng(seed: string): Prng {
  let state = seedState(seed);

  const nextUint64 = (): bigint => {
    state = (state + GOLDEN_GAMMA) & MASK64;
    let z = state;
    z = ((z ^ (z >> 30n)) * MIX1) & MASK64;
    z = ((z ^ (z >> 27n)) * MIX2) & MASK64;
    return (z ^ (z >> 31n)) & MASK64;
  };

  const nextBelow = (bound: number): number => {
    if (!Number.isInteger(bound) || bound <= 0) {
      throw new RangeError(`bound 는 1 이상의 정수여야 합니다 (받은 값 ${bound})`);
    }
    const n = BigInt(bound);
    // 2^64 를 n 으로 나눈 나머지만큼의 앞부분을 버려 균일성을 맞춘다.
    const threshold = (1n << 64n) % n;
    let value = nextUint64();
    while (value < threshold) {
      value = nextUint64();
    }
    return Number(value % n);
  };

  return { nextUint64, nextBelow };
}

/**
 * 시드 기반 Fisher–Yates. 원본 배열은 바꾸지 않는다.
 * 같은 시드·같은 길이면 항상 같은 순열을 낸다.
 */
export function shuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const prng = createPrng(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = prng.nextBelow(i + 1);
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
