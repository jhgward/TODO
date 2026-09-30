# 2026-09-29 CLAUDE.md SDD 스펙 반영

## 변경 내용
CLAUDE.md를 SDD(Spec-Driven Development) 기준으로 재구성했다.
- **프로젝트 개요와 구조**: 명세가 단일 진실 공급원이라는 원칙, 진행 현황(FR-001 구현 범위), 경로 별칭·요청 흐름·ESLint 경계 강제 추가
- **기술 스택**: 실제 설정 반영 (`postgres` 드라이버, DATABASE_URL, Tailwind 4 CSS 설정, next/jest, ESLint 9)
- **명세 문서 경로**: 문서별 역할·참조 시점 표, 실제 파일명 `TEXT_CASES.md` 명시, 알려진 명세-코드 불일치 목록
- **코딩 컨벤션**: 에러 코드 목록, REQUIREMENTS.md 문구 사용, 테스트 네이밍(TC ID)·날짜 계산 규칙 추가
- **SDD 워크플로 규칙**: 명세 확인 → Red → Green → Refactor → 변경 전파 순서 → 작업 범위 경계 → 작업 기록
- 기존 "작업 기록" 규칙은 SDD 워크플로 7번으로 이동, 기존 TDD·경계 규칙은 워크플로에 통합

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `ls docs docs/history` | 명세 문서 실제 파일명과 기존 작업 기록 확인 |
| `npm pkg get scripts` | CLAUDE.md 명령어 섹션을 실제 npm 스크립트와 맞추기 위함 (`lint`가 `eslint .`로 바뀐 것 반영) |
| `find app src __tests__ -type f -not -name .gitkeep` | 현재 구현된 파일을 파악해 진행 현황 작성 |

## 후속 과제
- TRD·README의 `@vercel/postgres`/`POSTGRES_URL`, `validations/ticket.ts`, `tailwind.config.ts` 표기를 실제와 맞추기 (CLAUDE.md의 "알려진 명세-코드 불일치"에 기록)
