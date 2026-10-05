import "server-only";

import type { RationalString } from "@/lib/types";

/**
 * 정확한 유리수 산술 (계획 01 §2 `rational.ts`).
 *
 * 기여도·사례 거리는 부동소수점으로 계산하면 `data/stimuli/*.json` 의 기준값과
 * 어긋날 수 있다. 기준값은 Python `fractions.Fraction` 으로 생성했으므로
 * 여기서도 bigint 유리수로 정확히 계산한다(CLAUDE.md 규칙 5).
 *
 * 불변식: `d > 0`, `gcd(|n|, d) === 1`. 0 은 항상 `{ n: 0n, d: 1n }`.
 * 이는 Python Fraction 의 정규형과 같으므로 직렬화 결과도 일치한다.
 */
export interface Rational {
  readonly n: bigint;
  readonly d: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function toBigInt(value: bigint | number): bigint {
  if (typeof value === "bigint") return value;
  if (!Number.isInteger(value)) {
    throw new TypeError(`유리수의 분자·분모는 정수여야 합니다: ${value}`);
  }
  return BigInt(value);
}

/** 기약분수를 만든다. 분모 0 은 예외. */
export function rational(
  numerator: bigint | number,
  denominator: bigint | number = 1n,
): Rational {
  let n = toBigInt(numerator);
  let d = toBigInt(denominator);
  if (d === 0n) {
    throw new RangeError("유리수의 분모는 0 이 될 수 없습니다.");
  }
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  // gcd(0, d) === d 이므로 0 은 {0n, 1n} 으로 정규화된다.
  return { n: n / g, d: d / g };
}

export const ZERO: Rational = { n: 0n, d: 1n };
export const ONE: Rational = { n: 1n, d: 1n };

export function add(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a: Rational, b: Rational): Rational {
  return rational(a.n * b.n, a.d * b.d);
}

export function div(a: Rational, b: Rational): Rational {
  if (a.d === 0n || b.n === 0n) {
    throw new RangeError("0 으로 나눌 수 없습니다.");
  }
  return rational(a.n * b.d, a.d * b.n);
}

export function neg(a: Rational): Rational {
  return { n: -a.n, d: a.d };
}

export function abs(a: Rational): Rational {
  return a.n < 0n ? { n: -a.n, d: a.d } : a;
}

/** a < b → -1, a === b → 0, a > b → 1 */
export function compare(a: Rational, b: Rational): -1 | 0 | 1 {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function equals(a: Rational, b: Rational): boolean {
  // 둘 다 기약분수이므로 성분 비교로 충분하지만, 외부에서 만든 값도 받도록 교차곱으로 본다.
  return compare(a, b) === 0;
}

export function isZero(a: Rational): boolean {
  return a.n === 0n;
}

export function sum(values: Iterable<Rational>): Rational {
  let acc = ZERO;
  for (const value of values) acc = add(acc, value);
  return acc;
}

/**
 * `"7/24"`, `"0/1"`, `"-1/24"` 형식으로 직렬화한다.
 * Python `f"{x.numerator}/{x.denominator}"` 와 같은 결과를 내야 한다.
 */
export function toRationalString(a: Rational): RationalString {
  return `${a.n}/${a.d}`;
}

/** `"7/24"` 를 파싱한다. 형식이 다르면 예외. */
export function parseRational(text: string): Rational {
  const match = /^(-?\d+)\/(\d+)$/.exec(text);
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new TypeError(`유리수 문자열 형식이 아닙니다: ${text}`);
  }
  return rational(BigInt(match[1]), BigInt(match[2]));
}

/** 표시용 근사값. 비교·누적 계산에는 쓰지 않는다. */
export function toNumber(a: Rational): number {
  return Number(a.n) / Number(a.d);
}
