# 2026-09-30 /speckit.implement — Phase 4–6 (US2 · US3 · Polish)

tasks.md T016–T030 완료 → 전체 30/30. 이전 단계는 [2026-09-30-implement-phase1-3.md](./2026-09-30-implement-phase1-3.md).

## Phase 4 — US2 설명·종료예정일 (T016–T019)
- Red: 001-7(설명 1001자), 001-17(설명 1000자), 001-12(오늘 마감), 001-13(내일 마감) 추가 → 2개 실패 (경계값 2개는 기존 동작으로 통과)
- Green: description `.max(1000)`, dueDate 비교 `>=` → `>` → 19/19

## Phase 5 — US3 형식 오류 (T020–T025)
- Red: 001-14(비 JSON 본문, 배열 본문), 001-15(숫자 제목), 001-16(`2026/10/01`, `2026-02-30`), 001-18(시스템 필드 무시) 추가 → 5개 실패 (001-18은 Zod strip + 서비스 status 지정으로 이미 통과)
- Green:
  - `src/shared/validations/common.ts` 신규: `REQUEST_FORMAT_ERROR_MESSAGE`, `isValidDateString`(형식 + 실제 달력 날짜)
  - `tickets.ts`: 루트·필드별 `invalid_type_error`, 날짜 필드 공통 `dateString`
  - `src/server/middleware/validate.ts` 신규: `validateBody` (JSON 파싱 실패 → 400, Zod 첫 오류 → 400)
  - `route.ts`: `validateBody` → 서비스 → 201, try/catch → `handleUnexpectedError`(500)
  - 25/25

## Phase 6 — Polish (T026–T030)
- T026 Refactor: 메시지를 `TICKET_ERROR_MESSAGES` 상수로 통합
- T027 품질 게이트: Prettier · tsc · lint · test(25/25) · build 모두 통과 (`/api/tickets` 동적 라우트 빌드)
- T028 수동 확인(tika_dev, 포트 3100): 7개 시나리오 모두 기대값. tika_dev Backlog가 비어 있어 **position 0 → −1024 → −2048**을 실제 DB에서 확인
- T029 CLAUDE.md 진행 현황 갱신

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `cat >> __tests__/api/tickets.test.ts <<'EOF'` | 기존 테스트를 수정하지 않고 스토리별 describe 블록을 파일 끝에 추가 |
| `npx prettier --write __tests__` | 추가 테스트 포맷 정리 |
| `npx jest` | 각 스토리 Red(실패) → Green(통과) 확인 |
| `sed -i '' -E 's/^- \[ \] (T0..) /- [X] \1 /' tasks.md` | 완료 작업 체크 |
| `npx prettier --check … && npx tsc --noEmit && npm run lint && npm run test && npm run build` | constitution 품질 게이트 일괄 실행 (`&&`로 하나라도 실패하면 중단) |
| `npx next dev -p 3100` (백그라운드) | 수동 확인용 개발 서버. 기본 3000 포트 충돌을 피하려고 3100 사용 |
| `curl --retry 30 --retry-connrefused --retry-delay 1` | 서버가 뜰 때까지 재시도 (foreground sleep 대신) |
| `TZ=Asia/Seoul date +%F` / `date -v+1d +%F` | 한국 기준 오늘·내일 날짜 계산 (macOS `date -v`) |
| `curl -s -w '[%{http_code}]' -X POST …` | 응답 본문과 상태 코드를 함께 출력 |
| `pkill -f "next dev -p 3100"` | 수동 확인 후 개발 서버 종료 (종료 코드 144는 이 때문) |

## 참고
- 수동 확인으로 tika_dev에 티켓 3건(id 1~3, "수동확인 1~3")이 생성됨
- 500 경로는 자동 테스트 없이 코드로만 확인 (tasks.md Notes)
