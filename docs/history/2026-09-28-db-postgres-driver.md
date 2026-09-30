# 2026-09-28 DB 스키마 확인 및 postgres 드라이버 전환

## 요청
DATA_MODEL.md §3 기준 `src/server/db/schema.ts` 구현, 로컬 PostgreSQL을 `postgres` 드라이버 + `DATABASE_URL`로 연결

## 결과
- `schema.ts`: Green 단계에서 이미 §3과 동일하게 구현됨 (12개 칼럼, 인덱스 3개) → 변경 없음
- `src/server/db/index.ts`: `drizzle-orm/node-postgres` → `drizzle-orm/postgres-js`, `idle_timeout: 10` 설정
- 의존성: `postgres` 추가, `pg`/`@types/pg` 제거
- 테스트 6개 통과, tsc·eslint 통과, tika_test 마이그레이션 상태 정상

## idle_timeout을 넣은 이유
postgres 드라이버는 기본값으로 유휴 연결을 닫지 않는다. 설정 없이 실행하면 테스트는 통과하지만 Jest가 종료되지 않고 무한 대기했다(40초 제한으로 확인).
10초로 설정해 이전 `pg` 드라이버(유휴 10초 후 종료)와 같은 동작이 되게 했다.

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `npm install postgres` / `npm uninstall pg @types/pg` | 드라이버 교체 |
| `perl -e 'alarm 40; exec @ARGV' npx jest` | macOS에 `timeout`이 없어 perl로 40초 제한을 걸고 실행. Jest가 종료되지 않는지 확인하기 위함 |
| `pkill -f "node_modules/.bin/jest"` 등 | 종료되지 않고 남은 Jest 프로세스 정리 |
| `npx jest` (소요 시간 측정) | idle_timeout 적용 후 6 passed, 약 12초 후 정상 종료 확인 |
| `(set -a; . ./.env.test; set +a; npx drizzle-kit migrate)` | tika_test 마이그레이션 상태 확인 (새로 적용할 것 없음) |
| `npm ls pg postgres` | drizzle-kit이 여전히 `pg`를 쓰는 원인 확인 |

## 참고
- `pg`는 `drizzle-orm`의 선택적 peer dependency라 npm이 자동 설치한다. drizzle-kit(마이그레이션 CLI)은 `pg`가 있으면 우선 사용하지만, 앱 코드는 `postgres`만 사용한다.
- `Jest did not exit one second...` 경고는 유휴 타임아웃까지 기다리는 동안 계속 표시된다.
