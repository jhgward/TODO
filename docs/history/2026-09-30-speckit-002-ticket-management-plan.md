# 2026-09-30 7개 API 구현 검토 + 002 계획 (specify → plan → tasks)

## 검토 결과
| # | 엔드포인트 | 상태 |
|---|-----------|------|
| 1 | POST /api/tickets | 구현됨 (specs/001) |
| 2 | GET /api/tickets | 미구현 |
| 3 | GET /api/tickets/:id | 미구현 |
| 4 | PATCH /api/tickets/:id | 미구현 |
| 5 | PATCH /api/tickets/:id/complete | 미구현 (.gitkeep만) |
| 6 | DELETE /api/tickets/:id | 미구현 |
| 7 | PATCH /api/tickets/reorder | 미구현 (.gitkeep만) |

사용자 선택: 바로 구현하지 않고 Spec Kit으로 계획 먼저 → 코드 변경 없음.

## 사용자 결정 (spec.md Clarifications)
1. reorder `position` = 대상 칼럼 내 인덱스(0부터). 순서 값은 서버가 계산
2. 이미 DONE인 티켓 재완료 = 변경 없이 200
3. Backlog로 이동하면 어느 칼럼에서 오든 startedAt = null

## 기본값으로 정한 사항 (research.md)
- 중간값은 내림, 사이 정수가 없으면(간격 ≤ 1) 칼럼 전체 0부터 1024 간격 재정렬 (DATA_MODEL 기준, API_SPEC "1 미만"과 다름)
- id 형식 오류 → 400 "요청 형식이 올바르지 않습니다"
- PATCH: 종료예정일은 생성과 같이 내일부터, status 등은 무시, 빈 본문은 변경 없이 200
- isOverdue는 보드·상세·수정 응답에만 포함 (완료·이동·생성 응답은 API_SPEC 예시대로 미포함)
- 규칙은 `ticketRules.ts` 순수 함수로 분리해 DB 없이 단위 테스트 (tika_test를 비울 수 없기 때문)
- `jest --runInBand` (API 테스트 파일이 늘어 같은 DB를 동시에 쓰는 문제 방지) — 설정 변경, 계획 승인 필요

## 산출물 (specs/002-ticket-management-api/)
spec.md(스토리 6개, FR 23개, SC 6개) · checklists/requirements.md(16/16) · plan.md · research.md(R1~R11) ·
data-model.md · contracts/ticket-management.md · quickstart.md · tasks.md(52개 작업, 9개 Phase)

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `find app/api -type f` | 실제 구현된 Route 파일 확인 |
| `sed -n '/^## 2\. GET/,/…/p' docs/API_SPEC.md` | API_SPEC §2~7과 Zod 스키마 예시 부분만 추출 |
| `sed -n '/^### TC-API-002/,/^## 2\./p' docs/TEXT_CASES.md` | TC-API-002~008 시나리오 47개 확인 |
| `mkdir -p specs/002-…/{checklists,contracts}` + `printf … > .specify/feature.json` | feature 디렉터리 생성, 후속 Spec Kit 명령이 찾을 경로 기록 |
| `.specify/scripts/bash/setup-plan.sh --json` | plan 템플릿 복사·경로 확인 |
| `.specify/scripts/bash/setup-tasks.sh --json` | tasks 템플릿·사용 가능 문서 확인 |
| `grep -cE '^- \[ \] T[0-9]{3}' tasks.md` 등 | 작업 형식 검증, 스토리별·병렬 작업 수 집계 |
