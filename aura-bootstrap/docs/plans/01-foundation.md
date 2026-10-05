# 계획 01 — 기반 세팅 (확정본, 2026-10-06)

이 계획은 연구자가 승인한 확정본이다. 각 체크포인트에서 결과를 보고하고 다음으로 넘어간다. 범위 밖 작업은 하지 않는다.

## 확정된 결정
| # | 결정 |
|---|---|
| D1 | pnpm, Tailwind CSS, Vitest. Node 20 이상 (Supabase CLI 요구사항) |
| D2 | 모든 DB 접근은 서버(Route Handler/Server Action)에서 **Supabase secret key(`sb_secret_…`)**로만. 클라이언트용 Supabase 키는 쓰지 않는다(브라우저에서 Supabase를 직접 호출하지 않음). 모든 테이블 RLS 활성화, 정책 없음. 레거시 anon/service_role 키는 2026년 말 폐지 예정이므로 사용하지 않는다 |
| D3 | 서명된 httpOnly 쿠키로 participant_id 식별. URL에 식별자·단계·조건 없음 |
| D4 | 연구자 시작 화면은 환경변수 패스코드 (플레이스홀더) |
| D5 | 파일럿과 본 실험의 배정 블록 시퀀스 분리 |
| D6 | 로컬은 Supabase CLI 스택. 컨테이너 런타임은 **OrbStack 권장**(Supabase 공식 문서의 macOS 권장, Docker Desktop도 가능). CLI는 프로젝트 devDependency로 설치하고 `pnpm supabase ...`로 실행 |

## 환경과 배포 경로
- 로컬: `pnpm supabase start` → 출력된 API URL과 secret key를 `.env.local`에 넣는다.
- 원격: Supabase 프로젝트는 서울 리전으로 생성. `pnpm supabase link` 후 `pnpm supabase db push`로 마이그레이션 적용(**prod 대상이므로 실행 전 연구자 확인**).
- Vercel: Git 연동 배포. `vercel.json`에 `"regions": ["icn1"]`로 함수를 DB와 같은 서울에 둔다. 배포 후 함수 리전이 실제로 icn1인지 확인.
- 환경변수 (`.env.example`만 커밋)
  - `SUPABASE_URL` (서버 전용)
  - `SUPABASE_SECRET_KEY` (서버 전용)
  - `RESEARCHER_PASSCODE`
  - `SESSION_SECRET`
  - `NEXT_PUBLIC_` 접두사 변수는 두지 않는다.

## 1. 스캐폴딩
- create-next-app: App Router, TypeScript strict, ESLint, Tailwind, `src/` 없음.
- 디렉터리: `app/`(참가자 `/run`, 연구자 `/start`), `app/api/`, `server/`(파일마다 `import 'server-only'`; `rules/`, `stimuli/`, `db/`), `lib/`(클라이언트 공유 가능 타입만), `config/experiment.ts`, `content/`(플레이스홀더 텍스트), `supabase/migrations/`, `tests/unit/`, `tests/db/`.
- 유출 방지: ESLint `no-restricted-imports`(클라이언트 컴포넌트에서 `server/*`, `data/*` 금지) + `check:bundle` 스크립트(빌드 후 `.next/static`에서 `"type":"FP"`, `"G":` 등 검색, 발견 시 실패).
- package.json 스크립트: `dev`, `build`, `lint`, `typecheck`, `test`, `test:db`, `check:bundle`, `stimuli:generate`(python 생성기 실행).
- UI는 빈 화면과 상태 확인 페이지까지만.
- **체크포인트 1**: build·typecheck·lint 통과.

## 2. TS 규칙 함수 (`server/rules/`)
- `rational.ts`: bigint 유리수, 약분, 비교, `"7/24"` 직렬화.
- `rules.ts`: `G(features, tau)`, `A(features)`, `confusionType`. 입력 타입 `{E,P,R,T}`에 age 없음.
- `shapley.ts`: 기준 집합 16개, `v(S)`, 정확한 interventional Shapley.
- `cases.ts`: LC/HC01~16 생성, 거리, 동률 시 작은 ID, 동률 개수.
- `validate.ts`: 범위 검증, 실패 시 예외.
- `server/stimuli/load.ts`: JSON 로드 + zod 검증 + 정규화 JSON sha256.
- `order.ts`: 시드 기반 PRNG + Fisher–Yates.
- **테스트**: 24개 프로필 전 필드 일치(G, A, 유형, fi, case_id, case_distance, case_tie_count) / v0+Σφ=A, φT=0 / 라운드별 3·2·2·5 / 경계값(T=τ, τ−0.5, E 5·6, P 4·5·6, R 2·3) / 범위 밖 예외 / age 전달 시 컴파일 오류(`@ts-expect-error`) / 셔플 재현성과 순열 여부 / 해시 안정성.
- **체크포인트 2**: 단위 테스트 전부 통과. (DB 불필요, 먼저 진행)

## 3. 마이그레이션 `0001_init.sql`
- 열거형: authority, explanation, risk, risk_order, 결측 사유.
- 테이블: docs/05의 11개 + `participants.current_stage`. `cells`(12행 고정 시드: cell_index → authority·explanation·risk_order).
- 제약: I/F `smallint check in (0,1)` null 허용·기본값 없음, `round in (1,2)`, `unique(participant_id, round, profile_id)`, 쓰기마다 `idempotency_key unique`, events는 `event_id` PK, `assignments.participant_id` PK.
- 트리거: (a) 라운드 잠금 후 해당 라운드 `initial_judgments` 변경 거부, (b) 잠금 전 `final_judgments` INSERT 거부.
- 보안: 모든 테이블 RLS on, 정책 없음. `anon`, `authenticated`의 테이블·함수 권한 회수.
- `raw_response`는 `text`.

## 4. 배정 함수 `assign_participant(p_participant_id uuid)`
- 이미 배정이 있으면 반환(멱등).
- `pg_advisory_xact_lock`으로 배정 구간 직렬화(RPC는 단일 트랜잭션이므로 트랜잭션 범위 잠금으로 충분).
- participants.is_pilot에 맞는 시퀀스에서 가장 오래된 열린 블록의 다음 빈 슬롯 사용. 블록 생성 시 12셀을 무작위 순서로 슬롯에 배치. 없으면 새 블록 생성.
- 라운드별 시드 2개 생성. pgcrypto는 Supabase에서 `extensions` 스키마에 있으므로 `extensions.gen_random_bytes`로 호출.
- `security definer`, `set search_path = ''`(모든 객체 스키마 명시), 실행 권한은 `service_role`에만.
- 탈락 자리는 재충원하지 않음.
- **DB 테스트** (로컬 스택, supabase-js + secret key): 50개 동시 RPC 호출 → 중복 없음, 꽉 찬 블록마다 12셀 각 1회, 미완성 블록 최대 1개 / 같은 참가자 반복 호출 결과 동일 / 파일럿·본 실험 블록 분리 / 잠금 트리거 2종 동작.
- **체크포인트 3**: `pnpm supabase db reset`으로 마이그레이션 적용, DB 테스트 통과.

## 5. 마무리
- 배정 Route Handler 1개(서버에서 RPC 호출, 응답에 조건 정보를 넣지 않음).
- `pnpm build && pnpm check:bundle` 통과.
- CLAUDE.md의 명령어·디렉터리 TODO를 실제 값으로 갱신.
- **체크포인트 4**: 위 항목 보고.

## 범위 밖
참가자 화면(docs/07), 판단 저장 API, RAIR·RSR 계산, 이벤트 로거, E2E, Vercel·prod 배포 실행.
