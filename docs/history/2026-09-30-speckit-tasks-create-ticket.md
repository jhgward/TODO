# 2026-09-30 /speckit.tasks — 티켓 생성 작업 목록

## 결과
`specs/001-create-ticket-api/tasks.md` — 30개 작업, 6개 Phase

| Phase | 작업 | 내용 |
|-------|------|------|
| 1 Setup | T001–T003 | 명세 선행 수정 (REQUIREMENTS, API_SPEC, TEXT_CASES 001-12~19 추가) |
| 2 Foundational | T004–T009 | shared types, errorHandler, 스키마 `.$type<>()`, 동작 변화 없는 정리 |
| 3 US1 (P1, MVP) | T010–T015 | 제목 trim·공백 거부, position 규칙 (Red → Green) |
| 4 US2 (P2) | T016–T019 | 설명 1000자, 종료예정일 내일부터 |
| 5 US3 (P3) | T020–T025 | 형식 오류 공통 메시지, validate 미들웨어, 500 처리 |
| 6 Polish | T026–T030 | 메시지 상수화, 품질 게이트, 수동 확인, 기록 |

## 결정 사항
- TDD 필수(CLAUDE.md·constitution)라 테스트 작업 포함, 시나리오마다 Red 확인 작업을 별도로 둠
- US1~US3는 기능상 독립이지만 같은 파일(`tickets.test.ts`, `validations/tickets.ts`)을 수정하므로 우선순위 순 순차 진행
- 빈 Backlog position 규칙은 DB 없는 서비스 단위 테스트(T011)로 검증 (Guardrails)

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `cat .claude/skills/speckit-tasks/SKILL.md` | tasks 명령 실행 절차 확인 |
| `sed -n '/Generate tasks.md/,/Mandatory Post-Execution/p' ...` | 출력이 잘린 skill 본문 중 tasks.md 필수 구성 부분만 다시 확인 |
| `.specify/scripts/bash/setup-tasks.sh --json \| python3 -c ...` | feature 디렉터리·사용 가능 문서 목록·tasks 템플릿 확보 |
| `grep -cE '^- \[ \] T[0-9]{3}' tasks.md` 등 | 체크리스트 형식(체크박스·ID·라벨) 검증, 스토리별·병렬 작업 수 집계 |
