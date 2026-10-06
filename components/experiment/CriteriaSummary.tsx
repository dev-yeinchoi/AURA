/**
 * 선정 기준 요약 (docs/07 공통 레이아웃 원칙, docs/02).
 *
 * 모든 조건에서 동일하게 열람 가능하다. 전체 문구는 "선정 기준 보기"로 연다.
 */
export function CriteriaSummary({
  items,
  fullText,
}: {
  items: readonly string[];
  fullText: string;
}) {
  return (
    <section aria-label="선정 기준" className="bg-surface border-border rounded-card flex flex-col gap-2 border px-4 py-3.5">
      <h2 className="text-sm font-semibold">선정 기준</h2>
      <ul className="text-muted flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <details className="text-xs">
        <summary className="cursor-pointer py-1 underline">선정 기준 보기</summary>
        <p className="pt-2 leading-relaxed">{fullText}</p>
      </details>
    </section>
  );
}
