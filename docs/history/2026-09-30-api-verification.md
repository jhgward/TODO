# 2026-09-30 API 엔드포인트 구현·검증 점검

코드·테스트·명세 수정 없음. 점검과 보고만 수행.

## 결과 요약
- 7개 엔드포인트 모두 구현됨 (Route export 7개, build 출력에 API 라우트 4개)
- Jest 123개 테스트(10개 파일) 전부 통과, `tsc`·lint·build 통과
- docs/TEXT_CASES.md API 시나리오 82개 중 80개는 같은 ID의 테스트가 있고, 2개(001-19, 005-7)는 ID 없는 단위 테스트로 간접 검증

## 엔드포인트별
| # | API | 명세 (API_SPEC.md) | 구현 | 검증 |
|---|-----|--------------------|------|------|
| 1 | POST /api/tickets | §1, FR-001. Backlog 맨 위 생성, 201, 검증 실패 400 | `route.ts` POST → `ticketService.create` | TC-API-001 19개 시나리오, 테스트 25개 통과 |
| 2 | GET /api/tickets | §2, FR-002·008. 4칼럼 그룹화, position 정렬, Done 24시간, isOverdue, total | `route.ts` GET → `getBoard` → `groupBoard` | TC-API-002 8개(17개 통과) + TC-API-008 7개(7개 통과) |
| 3 | GET /api/tickets/:id | §3, FR-003. 전체 필드 + isOverdue, 404, id 형식 400 | `[id]/route.ts` GET → `getById` | TC-API-003 5개, 테스트 7개 통과 |
| 4 | PATCH /api/tickets/:id | §4, FR-004. 부분 수정, null 삭제, 시스템 필드 무시 | `[id]/route.ts` PATCH → `update` | TC-API-004 14개, 테스트 18개 통과 |
| 5 | PATCH /api/tickets/:id/complete | §5, FR-005. DONE, completedAt, Done 맨 위, 재완료 무변경 | `[id]/complete/route.ts` PATCH → `complete` | TC-API-005 8개 중 7개 직접(7개 통과), 005-7 간접 |
| 6 | DELETE /api/tickets/:id | §6, FR-006. 하드 삭제 204, 404 | `[id]/route.ts` DELETE → `remove` | TC-API-006 3개, 테스트 5개 통과 |
| 7 | PATCH /api/tickets/reorder | §7, FR-007. 인덱스 기반 이동, position 계산·재정렬, 시작일·종료일 전이, 트랜잭션 | `reorder/route.ts` PATCH → `reorder` | TC-API-007 18개, 테스트 37개 통과 |

## 테스트 파일별
| 파일 | 테스트 | 통과 |
|------|--------|------|
| api/tickets.test.ts | 22 | 22 |
| api/ticketBoard.test.ts | 8 | 8 |
| api/ticketDetail.test.ts | 7 | 7 |
| api/ticketUpdate.test.ts | 18 | 18 |
| api/ticketComplete.test.ts | 7 | 7 |
| api/ticketDelete.test.ts | 5 | 5 |
| api/ticketReorder.test.ts | 19 | 19 |
| services/ticketService.test.ts | 3 | 3 |
| services/ticketRules.test.ts | 16 | 16 |
| services/ticketReorderRules.test.ts | 18 | 18 |

## 검증이 약한 부분
- 005-7 (빈 Done 칼럼이면 position 0): 전용 테스트 없음. 같은 함수 `getNextTopPosition(null) → 0` 단위 테스트와 개발 서버 수동 확인(완료 시 position 0)으로만 확인
- 001-19: 테스트는 있으나 이름에 ID가 없음 (`describe`에만 `TC-API-001-19`)
- 500 INTERNAL_ERROR 경로(`withErrorHandler`): 자동 테스트 없음
- reorder 트랜잭션 롤백(원자성): 자동 테스트 없음
- 002-1 빈 보드, 007-8 재정렬, 007-13 빈 칼럼, 007-16: DB 통합이 아닌 순수 함수 단위 테스트로만 검증 (tika_test를 비울 수 없기 때문)

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `grep -rnE "^export const (GET\|POST\|PATCH\|DELETE)" app/api` | Route Handler가 실제로 export하는 HTTP 메서드 확인 |
| `grep -nE "^export const \w+" src/server/services/ticketService.ts` | 서비스 함수 목록 확인 |
| `grep -cE "^\| 00N-[0-9]+ \|" docs/TEXT_CASES.md` | TC 그룹별 시나리오 수 집계 |
| `npx jest --runInBand --json --outputFile=<scratchpad>/jest-result.json` | 테스트별 통과 여부를 JSON으로 받아 집계 (결과 파일은 프로젝트 밖 scratchpad) |
| `python3 - jest-result.json <<'EOF'` | 테스트 이름의 TC ID 접두사로 시나리오별·파일별 통과 수 집계 |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` | 타입·린트 통과와 build 출력의 API 라우트 4개 확인 |
