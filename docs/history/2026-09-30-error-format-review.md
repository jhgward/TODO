# 2026-09-30 에러 응답 형식 일관성 검토

기준: API_SPEC.md 공통 규칙 `{ "error": { "code", "message" } }`, code는 VALIDATION_ERROR(400) / TICKET_NOT_FOUND(404) / INTERNAL_ERROR(500).

## 검토 방법
1. 코드: 응답을 만드는 모든 위치를 grep → 에러는 전부 `src/server/middleware/errorHandler.ts`의 `errorResponse`를 거침 (`validateBody`, `validateTicketId`, `notFoundResponse`, `withErrorHandler`)
2. 실측: 개발 서버(tika_dev)에 잘못된 요청 43가지를 보내 상태 코드·본문 키·code와 상태 코드의 짝을 기계적으로 검사

## 결과
| 구분 | 건수 | 결과 |
|------|------|------|
| 핸들러가 만든 에러 (400/404/500) | 35 | 형식 일치 |
| reorder `ticketId` 정수 범위 초과 | 1 | 형식은 맞지만 500 → **400으로 수정** |
| 핸들러 없는 메서드 (PUT /api/tickets 등) | 6 | Next.js 기본 405, 본문 없음 — **미수정 (명세 결정 필요)** |
| 없는 API 경로 (/api/tickets/1/unknown) | 1 | Next.js 기본 404 HTML — **미수정 (명세 결정 필요)** |

## 수정 (TDD)
- 명세: docs/TEXT_CASES.md에 007-19 추가
- Red: `__tests__/api/ticketReorder.test.ts`에 007-19 추가 → 기대 400, 실제 500
- Green: `reorderTicketSchema.ticketId`에 `.max(MAX_TICKET_ID)` 추가, `MAX_TICKET_ID`를 `common.ts`에서 export해 경로 id 검증과 공유
- 결과: 124/124 통과, tsc·lint 통과, 개발 서버에서 400 확인

## 미수정 항목과 이유
405와 없는 경로의 404는 Route Handler에 도달하기 전에 Next.js가 응답한다. 형식을 맞추려면 새 상태 코드(405)나 새 에러 코드가 필요한데,
API_SPEC은 상태 코드를 200/201/204/400/404/500으로, 에러 코드를 3종으로 제한한다(constitution II "명세에 없는 상태 코드 추가 금지").
사용자 결정: **그대로 둔다.** API_SPEC.md 공통 규칙에 "정의되지 않은 메서드·경로는 프레임워크 기본 응답이며 이 형식을 따르지 않는다"를 명시했다.

## 부작용과 복구
- 실측 중 `{"ticketId":1,"status":"TODO","position":1e300}` 요청이 200으로 처리되어(명세상 "칼럼 길이 이상이면 맨 뒤") tika_dev의 티켓 1이 BACKLOG → TODO로 이동함
- reorder API로 BACKLOG 맨 뒤(position 0, startedAt null)로 복구. `updatedAt`만 달라짐

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `grep -rnE "NextResponse\.json\(\|new NextResponse\(\|errorResponse\(…" app src` | 응답·에러를 만드는 모든 위치 확인 |
| `grep -rnE "throw \|status: [0-9]+" app src` | 직접 throw하거나 상태 코드를 지정하는 곳 확인 |
| `npx next dev -p 3100` + `python3 - <<'EOF'` (urllib) | 43가지 요청을 보내 에러 본문 형식을 자동 검사 |
| `npx jest … -t "007-19"` | Red 확인 (Expected 400, Received 500) |
| `npm run test` / `npx tsc --noEmit` / `npm run lint` | 수정 후 전체 회귀 확인 |
| `curl -X PATCH …/reorder -d '{"ticketId":1,"status":"BACKLOG","position":999}'` | tika_dev 티켓 1 원위치 복구 |
| `pkill -f "next dev -p 3100"` | 개발 서버 종료 |
