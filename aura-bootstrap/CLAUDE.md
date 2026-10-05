# AURA — CLAUDE.md

AURA(AI Authority, User Trust, and Reliance Assessment)는 대면 HCI 실험용 웹 플랫폼이다.
참가자는 가상 조직의 배정 과제에서 직원 12명 각각을 적격/부적격으로 판단하고(초기 판단), AURA의 판정을 본 뒤 다시 판단한다(최종 판단).
이 코드는 연구 데이터를 수집하는 실험 도구이므로, 기능보다 **조건 통제와 데이터 무결성**이 우선이다.

## 실험 설계 요약
- Between: Authority(low/high) × Explanation(none/fi/fi_case) = 6조건
- Within: Risk(low/high) 2라운드, 순서 counterbalancing → 배정 셀 12개
- 라운드당 프로필 12명, 이진 판단. 핵심 행동 지표 RAIR·RSR
- 대면 실험 약 40분, 동시접속 30~50명
- 명세 기준: Phase 0 rev08. 이 파일과 docs/가 충돌하면 docs/를 따르고 나에게 알린다.

## 명세 문서 (작업 전 관련 문서를 먼저 읽을 것)
- @docs/00-open-items.md — 미결 사항·플레이스홀더 목록. 여기 있는 항목은 추측하지 말고 설정값/플레이스홀더로 둔다
- @docs/01-manipulations.md — 권위 문구·배지, 설명 3유형, AI 제시 단계 규칙
- @docs/02-stimuli.md — G/A 규칙, 프로필 24명, 선정 기준, 시나리오 원문
- @docs/03-measures.md — PPD, Risk 확인, S-TIAS, 사후 설문, 인구통계
- @docs/04-reliance.md — RAIR·RSR·보조 지표 정의와 필수 테스트 케이스
- @docs/05-data-dictionary.md — 테이블·이벤트·결측 사유 초안
- @docs/06-procedure.md — 전체 흐름, 시간 규칙, 상태·복구, 화면 규칙, 수용 기준
- @docs/07-screens.md — 화면 목록, 와이어프레임 대비 조정 사항 (원본: docs/wireframe.pdf)
- 현재 실행 계획: @docs/plans/01-foundation.md

## 기술 스택
- Next.js (App Router) + TypeScript (strict)
- Supabase (Postgres, RLS), Vercel 배포(함수 리전 icn1), 별도 백엔드 서버 없음 (Route Handler / Server Action + Postgres 함수)
- pnpm, Tailwind CSS, Vitest, Node 20+. E2E는 Playwright 예정
- 로컬 DB: Supabase CLI(devDependency, `pnpm supabase ...`) + OrbStack
- Supabase 키: secret key(`sb_secret_…`)만 서버에서 사용. 레거시 anon/service_role 키와 `NEXT_PUBLIC_` 변수는 쓰지 않는다

## 명령어
- 예정(스캐폴딩 후 확정): `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, `pnpm check:bundle`, `pnpm stimuli:generate`
- 로컬 DB: `pnpm supabase start`, `pnpm supabase db reset`
- `pnpm supabase db push`는 원격(prod) 대상이므로 실행 전 반드시 나에게 확인받는다

## 디렉터리 구조
- `data/stimuli/` — 자극물 기준값 JSON (server-only, 생성기: `scripts/generate_stimuli.py`)
- TODO: 스캐폴딩 후 기입 (app/, components/, lib/, server/, supabase/migrations/, tests/)

## 실험 무결성 규칙 (IMPORTANT — 반드시 지킬 것)
1. **조건 간 동일성**: 조건마다 달라지는 것은 권위 안내·배지와 설명 표시뿐이다. 그 외 레이아웃, 문구, 색, 타이밍, 버튼 위치는 6조건에서 동일해야 한다. 조건 분기는 `AuthorityCue`, `Explanation` 컴포넌트 안에서만 일어나게 한다.
2. **정답과 AI 판정의 노출 통제**: G와 유형(TP/FP/FN/TN)은 절대 클라이언트로 보내지 않는다. A·기여도·사례는 해당 라운드 초기 판단 잠금 트랜잭션이 성공한 뒤에만 서버가 반환한다. `data/stimuli/`는 server-only 모듈에서만 import한다(클라이언트 번들에 포함되면 안 된다).
3. **자극물 하드코딩 금지**: 시나리오, 프로필, 선정 기준, 설명, 설문 문구는 데이터/콘텐츠 파일에서 읽는다. 컴포넌트에 직접 쓰지 않는다. 시나리오 원문은 한 글자도 바꾸지 않는다.
4. **자극물은 risk 수준을 키로 로드**한다. 라운드 번호로 로드하지 않는다.
5. **사전 고정값만 사용**: AI 판정·기여도·사례는 런타임에 생성·랜덤화하지 않는다. 실행 중 LLM이나 외부 API를 호출하지 않는다. TS 규칙 함수는 `data/stimuli` 값을 정확히 재현해야 하며(테스트로 검증), 나이는 규칙·기여도·사례 함수의 입력에 넣지 않는다.
6. **조건 정보 비노출**: URL, 페이지 제목, DOM 텍스트, 클래스명, 콘솔 로그에 조건명이 보이면 안 된다. 배정 직후 화면에도 처치 문구가 먼저 나타나면 안 된다.
7. **배정은 Postgres 함수에서 원자적으로**: 12셀 균형 블록, 1회 배정 후 불변. 클라이언트에서 배정하지 않는다.
8. **응답 기본값 금지**: 적격=1, 부적격=0, 무응답=null. 어떤 판단·설문도 미리 선택된 값을 두지 않는다. 최종 판단을 초기값이나 AI값으로 자동 선택하지 않는다.
9. **시간은 강제하지 않는다**: 예정 시간 안내 + 초과 기록. 시간 종료로 응답을 확정하거나 부적격 처리하지 않는다. 시간 값은 설정 파일 한 곳에서 관리한다.
10. **설문 문구·순서·척도는 docs/03 그대로** 사용한다.

## 데이터 규칙
- 연구 DB에는 가명 participant_id만. 이름·전화번호는 다루지 않는다.
- 서버 상태가 진행 단계의 기준이다. 새로고침·재접속 시 같은 단계·조건·순서·시드를 복원한다. AI 노출 후 초기 판단으로 돌아갈 수 없다.
- 초기 판단과 최종 판단은 별도 테이블. 초기값을 덮어쓰지 않는다.
- 모든 쓰기에 idempotency key, 이벤트는 event_id로 중복 제거. 시각은 서버 UTC.
- 원자료를 모두 저장한다. 지표는 분자·분모와 함께 저장하고 원자료에서 재산출 가능해야 한다. 분모 0은 NA + 사유 코드.
- 모든 참가자 레코드에 is_pilot. 규칙·자극물·설문·지표 계산에 버전을 붙인다.

## Supabase 규칙
- 스키마 변경은 supabase/migrations/의 마이그레이션 파일로만 한다.
- 모든 테이블에 RLS를 켜고 정책은 두지 않는다. 브라우저는 Supabase를 직접 호출하지 않으며, secret key는 서버 코드에서만 쓴다.
- security definer 함수는 `set search_path = ''`로 두고 객체를 스키마까지 명시한다. pgcrypto는 `extensions.` 접두사로 호출한다.
- dev와 prod 프로젝트를 구분한다. prod 대상 작업은 실행 전에 반드시 나에게 확인받는다.

## 디자인
- 실험 인터페이스는 중립적이고 단순하게 만든다. 장식적 요소를 추가하지 않는다.
- 색상만으로 의미를 구별하지 않는다. 키보드 이동·초점 표시·스크린리더 라벨을 제공한다.
- 기준 환경: 대면 PC 1280×720 이상, 200% 확대 점검. 화면 구현 후 이 해상도로 스크린샷을 찍어 검토한다.

## 작업 방식
- 새 기능은 계획을 먼저 제시하고, 승인 후 구현한다. 한 번에 한 단계씩 작게 진행한다.
- 진행 순서: 기반 세팅 → 1조건·1순서 수직 슬라이스(동의~사후 설문, 저장·로깅 포함) → 12셀 확장 → 검증·파일럿.
- **명세가 모호하거나 docs/에 없는 실험 관련 결정은 추측하지 말고 질문한다.**
- docs/와 data/stimuli/는 내 요청 없이 수정하지 않는다. 자극물 변경은 `scripts/generate_stimuli.py` 수정 후 재생성으로만 한다.
- 작업 후 typecheck, lint, 관련 테스트를 실행하고 결과를 보고한다.
- 조건 분기·노출 통제·저장 로직을 바꿨다면 docs/06의 수용 기준 관련 테스트를 함께 실행한다.
