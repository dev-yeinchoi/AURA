# AURA — AI 보조 의사결정 연구 웹앱

Explanation Type × Authority Cue × Task Risk가 신뢰와 행동적 의존에 미치는 영향을 살펴보는 실험 웹앱입니다.

## 실행

```sh
npm install
npm run dev
```

- 참가자 시작 화면: http://localhost:3000
- 개발용 전체 흐름: http://localhost:3000/preview
- 주소창에는 **`localhost`**를 사용하세요. `192.168.x.x` 같은 네트워크 주소는 Next.js의 개발용 스크립트 보호 때문에 로딩 화면에서 멈출 수 있습니다. 3000번 포트가 사용 중이면 터미널의 `Local:` 뒤에 표시된 포트를 사용하세요.
- 이전 미리보기 응답이 보이면 화면 아래 **처음부터** 버튼으로 새로 시작하세요.
- `npm run typecheck`: 타입 검사
- `npm run test`: 자극 계산·reliance·단계 잠금 검증
- `npm run test:browser`: 실행 중인 로컬 서버와 Chrome에서 브라우저 검증
- `npm run build`: 배포용 빌드

## 구현 상태

| 구분 | 상태 |
| --- | --- |
| 기술 | Next.js + TypeScript, Supabase, Vercel 사용 확정 |
| 디자인 원본 | [Figma 화면 디자인](https://www.figma.com/design/5ogQmEK8OAeeZ82UbKo65U/XAI---Power-Distance?node-id=355-2) |
| 기기 | PC·노트북 브라우저. Figma 기준 1440×900, 좁은 화면은 줄바꿈·스크롤 적용 |
| 설문 | Figma 원문 수령 및 화면 구현. PPD15/상황 인식4/Trust3/사후 설문 |
| 실험 흐름 | 개발용 두 라운드 미리보기, 6조건 선택, 초기·최종 응답 분리, 제출 단계 잠금, 브라우저 이어하기 |
| 실제 운영 | 참가자 조회·서버 배정·Supabase 저장·연구자 내보내기·Vercel 배포는 아직 연결 전 |
| 연구 문서 | 첨부 설명문·서면 동의서는 로컬 개발 미리보기에만 연결. 공개 저장소·배포에는 포함하지 않음 |

> `/preview`는 개발 환경에서만 열립니다. 입력은 해당 브라우저의 개발용 저장소에만 남으며 실제 연구 데이터로 사용할 수 없습니다. `/`에서 참가자 번호 확인은 아직 실제 조회를 수행하지 않습니다. 미리보기의 동의 선택은 서면 동의서의 서명을 대신하지 않습니다.

## 최신 연구 결정

- 6개 참가자 간 조건과 4개 Risk×A/B 순서를 사용합니다. 본 실험에서는 서버에서 균형 무작위 배정해야 합니다. 미리보기는 화면 점검을 위해 조건을 직접 선택합니다.
- 라운드당 직원12명. 정답상 배정5명/AURA추천5명이지만 참가자 선택 인원에는 제한이 없습니다. TP3/FP2/TN5/FN2입니다.
- 직원은 첫 판단·최종 판단에서 01~12 순서로, AURA 정보 화면에서는 추천 먼저·번호순으로 표시합니다. 초기 판단을 제출한 뒤 10초 후 AURA 정보가 자동으로 나타나고, 30초가 지나면 최종 판단을 진행할 수 있습니다. 최종 판단은 빈 선택에서 시작합니다. 정답·점수는 종료 후에도 표시하지 않습니다.
- **High Risk는 사용자가 확인한 현재 Figma 설명문**을 사용합니다. 예산 관리 총괄팀 배정, 결정자 성과평가·기회와 회사 손실, 결정자 책임 기록을 포함합니다. 이전 직원 피해 중심 초안을 대체합니다.
- **유사 사례는 ‘당시 담당자의 최종 결정’만 표시**합니다. 사례의 AURA 판단·규칙상 결과는 표시하지 않습니다. 사례 FI와 네 특성값은 유지합니다.
- 직원24명/사례32개 수치 v2는 파일럿 검토용입니다. 사례 표시 v3의 `historicalDecision`은 가상 담당자 결정이며, 초안에서는 각 사례의 규칙상 결과와 일치하도록 설정했습니다. 실제 사람의 관측 응답이 아닙니다.
- 파일럿은 본 분석과 분리합니다. 최종 표본·제외 기준·채점은 이후 확정합니다.

## 확인한 내용

타입 검사·배포용 빌드, 실험 규칙 테스트 7개, 전체 흐름/6조건 브라우저 테스트 2개를 통과했습니다. Chrome 1440×900·1366×768·1920×1080에서 가로 넘침을 확인했고, 배포용 `/preview`는 404로 생성됩니다. 실제 DB 저장·서버 배정 검증은 연결 후 진행합니다.

## 자료와 다음 연결 작업

| 파일 | 역할 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 연구 설계·확정 사항·Codex 작업 기준 |
| [Figma 원문](src/content/figma-source.json) | 화면 ID와 문항·선택지·시나리오 원문 |
| [수치 자료](src/content/stimuli-v2.json) | 직원/사례의 특성값·기여도·결과 및 표시 버전 |
| [노션용 명세](exports/AURA_배정_판단_설명_명세_노션.md) | 이전 수치안 검토용 내보내기. 최신 표시 변경은 AGENTS 우선 |

실제 운영 전 필요한 결정: 설문 필수 여부/채점 기준, 개인정보 보관·접근 설정, Supabase 프로젝트 및 Vercel 연결입니다. 기본 정보 화면에는 나이 항목이 없어 임의로 추가하지 않았습니다. Figma의 문항 오탈자도 그대로 보존했습니다.

### 로컬 연구 문서

첨부받은 PDF는 `data/private/documents/participant-information.pdf`와 `data/private/documents/written-consent.pdf`에 복사했습니다. 이 폴더는 Git에서 제외됩니다. 다른 컴퓨터에서 실행할 때는 해당 파일을 직접 복사해야 문서가 표시됩니다. PDF는 개발용 `/api/preview-document/information` 및 `/api/preview-document/consent`에서 `localhost`로 접속한 경우에만 제공됩니다. 설명문의 모집 인원 `000명`을 확정하고, 승인된 최종본을 받기 전에는 운영 화면에 게시하지 마세요.

### Supabase·Vercel 연결 순서

1. Supabase에서 AURA용 프로젝트를 만듭니다. 프로젝트의 **Connect** 화면에서 Project URL과 Publishable key를 확인합니다. 비밀 키는 채팅이나 GitHub에 올리지 않습니다.
2. 이 저장소의 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 넣습니다. 현재 앱은 아직 DB 연동 코드가 없으므로, 이 값만 넣어도 참가자 응답이 저장되지는 않습니다.
3. Vercel에서 **Add New → Project → Import Git Repository**로 `dev-yeinchoi/AURA`를 선택합니다. Framework Preset은 Next.js, Root Directory는 저장소 루트로 둡니다. 배포 환경 변수에도 같은 URL과 Publishable key를 설정합니다. 이후 GitHub push가 배포를 갱신합니다.
4. 실제 연구 데이터 수집 전에는 서버 배정·저장·접근 통제·내보내기를 구현하고 별도로 검증해야 합니다. Supabase 응답 테이블을 공개 읽기/쓰기로 설정하지 마세요.

GitHub: https://github.com/dev-yeinchoi/AURA.git
로컬: `/Users/yein/Developer/projects/aura`

비밀 키·참가자 자료·로컬 PDF는 `.gitignore`로 제외합니다. Vercel 배포는 아직 진행하지 않았습니다.
