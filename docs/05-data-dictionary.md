# 05. 데이터 사전과 이벤트 명세 (rev08 §10, §13)

아래 테이블 구조는 rev08 §10의 요구를 구현하기 위한 **초안**이다. 필드명 변경은 가능하지만, 각 줄의 "원칙"은 바꾸지 않는다.

## 공통 원칙
- 연구 응답에는 가명 `participant_id`만 사용한다. 이름·전화번호는 이 DB에 없다(신청 정보는 별도 관리, 플랫폼 범위 밖).
- 모든 시각은 서버 시각 UTC(`timestamptz`)로 저장한다. 클라이언트 시각은 보조 필드로만 둔다.
- 적격=1, 부적격=0, 무응답=null을 구별한다. 어떤 응답도 기본값을 부적격으로 두지 않는다.
- 모든 쓰기는 `idempotency_key`로 재시도 중복을 막는다.
- 모든 레코드는 `is_pilot`으로 구분 가능해야 한다(participants에 저장, 나머지는 FK로 조인).
- 연구용 CSV 추출에는 가명 데이터만 포함한다. 버전·분모·결측 사유를 포함한다.

## 테이블 초안
| 테이블 | 핵심 필드 | 원칙 |
|---|---|---|
| participants | participant_id, participant_code, is_pilot, consent_version, consent_given, created_at, completed_at, status | 연구자가 입력한 코드로 생성. 동의 거절 시 이후 수집 중단 |
| assignments | participant_id (PK), block_id, cell_index, authority, explanation, risk_order (`low_high`/`high_low`), profile_order_seed_r1, profile_order_seed_r2, assigned_at | DB 함수에서 원자적으로 1회만 생성. 재접속 시 불변 |
| assignment_blocks | block_id, cell_index(0~11), participant_id (nullable) | 12셀 균형 블록. 블록이 다 차면 새 블록을 무작위 순서로 생성 |
| stimulus_manifest | stimulus_version, risk, content_hash, G_version, A_version, FI_version, case_version, deployed_at | 배포 후 불변. 해시로 런타임 데이터 일치 확인 |
| initial_judgments | participant_id, round (1/2), risk, profile_id, display_index, I, answered_at, locked_at | 12개 확정 후 잠금. 잠금 이후 수정 불가 |
| round_locks | participant_id, round, initial_locked_at | 잠금 트랜잭션 성공 후에만 AI 페이로드 반환 |
| ai_exposures | participant_id, round, wait_started_at, wait_ended_at (실제 경과), payload_served_at, rendered_profile_ids | 렌더 로그는 제시 근거일 뿐 읽음의 증거가 아님 |
| final_judgments | participant_id, round, risk, profile_id, F, submitted_at | 초기값과 별도 테이블. 덮어쓰지 않음 |
| survey_responses | participant_id, round (nullable), item_id, raw_response (nullable), scale_version, missing_reason, answered_at | 원응답만 저장. 파생 점수는 분석 코드 |
| round_metrics | docs/04 참조 | 서버 계산값 + 분자·분모 |
| events | event_id (클라이언트 UUID), participant_id, sequence, stage, type, payload (jsonb), server_time, client_time | event_id로 중복 제거 |

## 이벤트 타입 (초안)
| type | 발생 시점 | payload 예 |
|---|---|---|
| stage_enter / stage_exit | 각 단계 진입·이탈 | stage, round |
| profile_open / profile_close | 자유 열람·최종 판단 중 프로필 상세 열기/닫기 | profile_id |
| criteria_open | 선정 기준 열람 | round |
| ai_detail_open / ai_detail_close | AI 판정·설명 재열람 | profile_id |
| judgment_change | 초기/최종 판단 선택·변경 (잠금 전) | phase, profile_id, value |
| overtime_start | 예정 시간 초과 시점 | stage, planned_seconds |
| incomplete_submit_attempt | 12개 미완료 상태 제출 시도 | missing_indices |
| tech_error | 저장 실패·네트워크 오류 | code, message |

이로부터 산출 가능해야 하는 값: 페이지별 체류시간, 초기·최종 판단 소요시간, 프로필별 열람 순서·횟수, 10초 대기 실제 경과, 단계별 초과 시간, 시작·종료 시각.

## 결측 사유 코드 (초안)
`no_opportunity`, `no_response`, `withdrawn`, `technical_error`, `not_exposed`, `dont_know`(PERC_ACC 전용)

## 버전 관리
규칙(G/A), 프로필, 기준 집합, 설명(FI/case), 설문(scale_version), 무작위 배정, 지표 계산(metrics_version) 각각에 버전과 해시를 부여하고 배포 manifest에 묶는다.
