# 2026-09-30 /speckit.implement — Phase 1–3 (명세 · 기반 · US1 MVP)

tasks.md T001–T015 완료 (15/30). Phase 4–6은 사용자 확인 후 진행.

## Phase 1 — 명세 선행 수정 (T001–T003)
- `docs/REQUIREMENTS.md` FR-001: dueDate "내일 이후 (오늘 불가, Asia/Seoul)", 메시지 표에 "요청 형식이 올바르지 않습니다" 추가
- `docs/API_SPEC.md` §1: dueDate 제약, 형식 오류 행 추가 / 공통 에러 코드 표에 INTERNAL_ERROR 메시지 "서버 내부 오류가 발생했습니다"
- `docs/TEXT_CASES.md` TC-API-001: 001-12 ~ 001-19 추가

## Phase 2 — 기반 정리, 동작 변화 없음 (T004–T009)
- `src/shared/types/index.ts` 신규: DATA_MODEL §4 전체 (const 객체 + typeof)
- `src/server/middleware/errorHandler.ts` 신규: `errorResponse`, `handleUnexpectedError` (500)
- `src/server/db/schema.ts`: status/priority에 `.$type<>()`, 기본값을 상수로. drizzle-kit 호환을 위해 상대 경로 import
- `src/shared/validations/tickets.ts`: priority를 `z.nativeEnum(TICKET_PRIORITY)`로, `CreateTicketInput`(z.infer) 제거
- `ticketService.ts`: `CreateTicketInput`을 `@/shared/types`에서 import / `route.ts`: `errorResponse` 사용
- 체크포인트: 기존 6개 테스트 통과, tsc·lint 통과, `drizzle-kit generate` → "No schema changes"

## Phase 3 — US1 (T010–T015)
- Red: API 테스트 6개(001-4, 5, 10, 11, 17 제목, trim 저장) + 서비스 단위 3개(001-19) 추가 → 7개 실패 확인
  (001-11, 제목 200자는 기존 동작으로 이미 통과 — spec.md 예상과 일치)
- Green: title `.trim().min(1)`, 서비스 `getNextTopPosition` + BACKLOG 최솟값 조회 + status 명시 → 15/15 통과

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` | implement 전제 조건(tasks.md 존재, feature 디렉터리) 확인 |
| `grep -cE '^- \[ \]' checklists/*.md` | 체크리스트 미완료 항목 수 → 0 (PASS) |
| `git rev-parse --git-dir` / `grep ... .gitignore .prettierignore` | ignore 파일 필수 패턴 확인 (skill 필수 단계) |
| `npx tsc --noEmit` / `npx eslint app src` | Phase 2 체크포인트 — 타입·린트 |
| `npx drizzle-kit check` / `npx drizzle-kit generate` | `.$type<>()`이 DB 스키마를 바꾸지 않는지 확인 ("No schema changes") + 상대 경로 import 해석 확인 |
| `cat >> __tests__/api/tickets.test.ts <<'EOF'` | 기존 테스트를 건드리지 않고 파일 끝에 US1 describe 블록 추가 |
| `npx prettier --write __tests__` | 추가한 테스트 포맷 정리 |
| `npx jest` | Red(7 failed) → Green(15 passed) 확인 |
| `sed -i '' -E 's/^- \[ \] (T0..) /- [X] \1 /' tasks.md` | 완료 작업 체크 (skill 규칙) |

## 참고
- tika_test의 기존 BACKLOG 티켓들은 예전 기본값(position 1)으로 저장되어 있어, 새 티켓은 1 − 1024부터 이어진다. 001-10은 상대 비교라 영향 없음
- ESLint `ignores`에 `coverage/**`가 없음 (skill 권장 패턴) — 설정 변경이라 보류
