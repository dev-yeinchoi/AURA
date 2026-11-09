/** Raw responses remain 1–5; only scale scoring reverses items 3 and 4. */
export function scoreNcs6(raw: readonly number[]) {
  if (raw.length !== 6 || raw.some(value => !Number.isInteger(value) || value < 1 || value > 5)) {
    throw new Error("NCS-6 응답은 1~5점 6개여야 합니다.");
  }
  const items = raw.map((value, index) => index === 2 || index === 3 ? 6 - value : value);
  const total = items.reduce((sum, value) => sum + value, 0);
  return { items, total, mean: total / 6 };
}
