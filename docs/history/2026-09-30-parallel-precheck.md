# 2026-09-30 구현 전 병렬 점검 (5개 영역)

`/speckit.implement` 착수 전, 서브에이전트 5개(Explore, 읽기 전용)로 동시에 점검했다. 코드·DB 변경 없음.

| 영역 | 결과 | 주요 내용 |
|------|------|-----------|
| 프로젝트 구조 | 정상 | tsc·eslint 통과. [신규] 예정 파일 4개는 아직 없음(예상대로). `db:seed` 스크립트의 seed.ts 없음 |
| DB 연결 | 정상 | postgres-js + DATABASE_URL + idle_timeout 10. tika_dev(0행)·tika_test(14행) 모두 tickets 테이블·마이그레이션 적용 |
| 공유 타입 | 미작성 | `src/shared/types/` 비어 있음. `CreateTicketInput`이 validations에 z.infer로 있음(SSoT 위반), 'LOW'/'MEDIUM'/'BACKLOG' 리터럴 중복 |
| Zod 스키마 | 13건 중 8건 불일치 | 빈/공백 제목 통과, 숫자 제목·배열 본문 영어 메시지, 설명 1001자 통과, 오늘 종료예정일 통과, `2026/10/01`·`2026-02-30` 통과, 비 JSON 본문 500 |
| DB 스키마 | 정상 | DATA_MODEL §2·3과 일치, 마이그레이션 일치, `drizzle-kit check` 통과. `.$type<>()` 미적용(T006 예정). position 기본값 1은 서비스가 항상 지정하므로 무관 |

## 새로 발견한 사항
- `2026/10/01`이 현재 dueDate 검사를 통과한다 — 문자열 비교에서 `/`(0x2F)가 `-`(0x2D)보다 커서 "미래"로 판정됨. T022(형식 검사를 날짜 비교보다 먼저)로 해결
- z.infer 결과에서 `priority`가 필수 타입이 되어 DATA_MODEL의 `priority?`와 다름 → T004·T007에서 정리
- 서브에이전트가 tika_test 정리(truncate/cleanup)를 제안했으나 constitution Guardrails(TRUNCATE·조건 없는 DELETE 금지)에 따라 채택하지 않음

## 실행 방식
- Agent 도구로 Explore 서브에이전트 5개를 한 번에 호출 (병렬)
- 각 에이전트가 실행한 주요 명령: `npx tsc --noEmit`, `npx eslint .`(타입·린트), `nc -z localhost 5432`(DB 포트), SELECT 전용 node 스크립트(테이블 존재·행 수), `npm ls pg postgres`(드라이버), `npx tsx -e`(스키마 safeParse 실험, 파일 생성 없음), `npx drizzle-kit check`(마이그레이션 일관성)
