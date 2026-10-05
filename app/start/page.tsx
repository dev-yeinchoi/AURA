import { PLACEHOLDER } from "@/content/placeholders";

/**
 * 연구자 시작 화면. participant_code 와 is_pilot 입력 후 세션을 시작한다(docs/06 단계 0).
 * 접근은 환경변수 패스코드로 제한한다(계획 D4). 폼 구현은 계획 01 범위 밖.
 */
export default function StartPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-2 p-8">
      <h1 className="text-lg font-semibold">연구자 시작</h1>
      <p className="text-muted text-sm">{PLACEHOLDER.researcherStart}</p>
    </main>
  );
}
