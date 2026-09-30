<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: 없음 (최초 제정)
- Added principles:
  - I. TypeScript Strict Mode (NON-NEGOTIABLE)
  - II. API Spec Fidelity
  - III. Uniform Error Response
  - IV. Zod Validation for Every Request
  - V. Business Logic in Services
- Added sections: Technology & Architecture Constraints, Development Workflow, Governance
- Removed sections: 없음
- Templates: .specify/templates/* 는 런타임에 constitution을 읽으므로 수정하지 않음
- Follow-up TODOs:
  - 현재 코드의 원칙 위반 여지: POST /api/tickets 가 JSON이 아닌 본문에서 명세 밖 500을 반환 (III, IV)
  - TRD.md·README.md의 DB 드라이버/환경 변수 표기가 실제 설정과 다름 (CLAUDE.md "알려진 명세-코드 불일치")
-->

# Tika Constitution

## Core Principles

### I. TypeScript Strict Mode (NON-NEGOTIABLE)
- `tsconfig.json`의 `strict: true`는 MUST 유지되어야 하며, 끄거나 파일 단위로 우회해서는 안 된다
  (`// @ts-nocheck`, `// @ts-ignore` 금지).
- `any`는 MUST NOT 사용한다. 타입을 알 수 없는 값은 `unknown`으로 받고 타입 가드나 Zod로 좁힌다.
- enum 대신 const 객체 + `typeof` 패턴을 사용하고, 공유 타입은 `src/shared/types`에서 import한다.
- 검증: `npx tsc --noEmit`과 ESLint(`@typescript-eslint/no-explicit-any: error`)가 오류 없이
  통과해야 한다. Jest(SWC)는 타입 검사를 하지 않으므로 테스트 통과만으로는 충족되지 않는다.

**Rationale**: 명세의 타입(DATA_MODEL.md §4)을 컴파일 시점에 강제해 AI 생성 코드의 오류를
런타임 전에 잡는다.

### II. API Spec Fidelity
- 모든 API 응답(상태 코드, 필드명, 필드 타입, null 처리, 날짜 형식)은 `docs/API_SPEC.md`와
  MUST 정확히 일치해야 한다.
- 명세에 없는 필드·엔드포인트·상태 코드를 MUST NOT 추가한다. 허용 상태 코드는
  200, 201, 204, 400, 404, 500뿐이다.
- 날짜는 사용자 입력 필드(`plannedStartDate`, `dueDate`)는 `YYYY-MM-DD`, 시스템 필드는 ISO 8601,
  "오늘"의 기준은 Asia/Seoul이다.
- 명세와 구현이 다르면 코드를 명세에 맞춘다. 명세가 틀렸다면 명세를 먼저 수정한 뒤 테스트 → 구현
  순으로 반영한다.
- 검증: 각 엔드포인트는 `docs/TEXT_CASES.md`의 TC-API 시나리오 테스트로 응답 형식을 확인한다.

**Rationale**: 프론트엔드와 백엔드가 명세를 계약으로 삼아 독립적으로 개발되므로, 명세 이탈은 곧
계약 위반이다.

### III. Uniform Error Response
- 모든 에러 응답 본문은 MUST `{ "error": { "code": string, "message": string } }` 형식이어야 한다.
- `code`는 `VALIDATION_ERROR`(400), `TICKET_NOT_FOUND`(404), `INTERNAL_ERROR`(500) 중 하나다.
- `message`는 `docs/REQUIREMENTS.md`·`docs/API_SPEC.md`에 정의된 한국어 문구를 그대로 사용한다.
  라이브러리 기본 메시지(예: Zod의 영어 메시지)를 그대로 노출해서는 MUST NOT 된다.
- 처리되지 않은 예외도 위 형식의 500 응답으로 변환되어야 한다. 스택 트레이스·DB 오류 원문을
  응답에 포함하지 않는다.

**Rationale**: 클라이언트(`src/client/api/ticketApi.ts`)가 단일 경로로 에러를 처리할 수 있게 하고,
사용자에게 일관된 메시지를 보여준다.

### IV. Zod Validation for Every Request
- 요청 본문, 경로 파라미터(예: `:id`), 쿼리 등 외부 입력은 MUST 서비스 호출 전에 Zod 스키마로
  검증한다. 검증되지 않은 값을 서비스·DB에 전달해서는 안 된다.
- Zod 스키마는 `src/shared/validations/`에 정의하고, 프론트엔드 폼 검증과 백엔드 API 검증이
  같은 스키마를 공유한다.
- 검증 실패는 원칙 III 형식의 400 `VALIDATION_ERROR`로 응답한다.
- status/priority 같은 값 제약은 DB ENUM이 아니라 Zod(애플리케이션 레벨)로 강제한다.

**Rationale**: 한 곳에서 정의한 규칙으로 클라이언트·서버 검증을 일치시키고, 잘못된 데이터가 DB에
도달하지 않게 한다.

### V. Business Logic in Services
- 비즈니스 규칙(status 전이, `startedAt`/`completedAt` 자동 관리, position 계산, `isOverdue`,
  Done 24시간 필터 등)은 MUST `src/server/services/`에만 작성한다.
- Route Handler(`app/api/`)는 요청 파싱 → Zod 검증 → 서비스 호출 → 응답 반환만 수행한다.
- 비즈니스 규칙을 DB 기본값이나 Route Handler에 암묵적으로 맡기지 않는다.
- DB 접근은 Drizzle ORM으로만 하며(raw SQL 금지), `src/server/`에는 React 코드를 두지 않는다.

**Rationale**: 규칙을 서비스 계층에 모아 단위 테스트가 쉽고, 엔드포인트가 늘어나도 규칙이 중복되지
않는다.

## Technology & Architecture Constraints

- Stack: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 4, @dnd-kit, Drizzle ORM +
  drizzle-kit, PostgreSQL(`postgres` 드라이버, `DATABASE_URL`), Zod 3, Jest + React Testing Library.
- 계층 경계: `src/server` ↔ `src/client` 상호 import 금지, 양쪽은 `src/shared`만 참조한다.
  ESLint `no-restricted-imports`로 강제한다.
- 프론트엔드의 API 호출은 `src/client/api/ticketApi.ts`를 통해서만 한다.
- 새 의존성 추가, 설정 파일 변경, 요청 범위 밖 계층 수정은 사용자 확인 후에만 한다.

## Development Workflow

- SDD: `docs/` 명세가 단일 진실 공급원이다. 작업은 대상 FR / US / TC 특정 → 명세 확인 →
  Red → Green → Refactor 순서로 진행한다.
- 명세에 공백·모순이 있으면 추측해서 구현하지 않고 사용자에게 확인한 뒤 명세부터 수정한다.
- Red: 테스트 코드만 작성하고 실패를 확인한다. Green: 테스트를 통과하는 최소 코드만 작성하며
  테스트를 수정하지 않는다. Refactor: 동작을 바꾸지 않는다.
- 테스트 삭제·skip 금지, `console.log` 커밋 금지, 명세에 없는 기능 추가 금지.
- 변경 전파 순서: 명세 → `docs/TEXT_CASES.md` → `src/shared/types` → `src/shared/validations` →
  `src/server` / `src/client`.
- 품질 게이트: `npx tsc --noEmit`, `npm run lint`, `npm run test`가 모두 통과해야 작업 완료로 본다.

## Governance

- 이 constitution은 다른 모든 개발 관행보다 우선한다. `CLAUDE.md`는 런타임 개발 지침이며,
  둘이 충돌하면 constitution이 우선하고 `CLAUDE.md`를 수정한다.
- 개정 절차: 개정 사유와 영향 범위를 문서화하고 사용자 승인을 받은 뒤
  `.specify/memory/constitution.md`를 수정하며, 상단 Sync Impact Report로 변경을 기록한다.
- 버전 정책(Semantic Versioning): MAJOR = 원칙 삭제·재정의 등 호환되지 않는 변경, MINOR = 원칙·섹션
  추가 또는 실질적 확장, PATCH = 문구·오타 등 의미 변화 없는 수정.
- 준수 확인: 모든 기능 계획(`/speckit-plan`의 Constitution Check)과 코드 리뷰에서 원칙 I~V 준수
  여부를 확인한다. 원칙을 벗어나야 한다면 그 이유를 계획 문서에 명시하고 승인을 받는다.

## 🚨 Guardrails (절대 준수 사항)

AI 코딩 에이전트가 실수로 위험한 작업을 수행하지 않도록 명시적으로 금지하는 규칙들이다.
**이 규칙들은 어떤 상황에서도 위반할 수 없다.**

### 데이터베이스 금지 명령어
- `DROP TABLE`, `DROP DATABASE` — 절대 금지
- `TRUNCATE` — 절대 금지
- `DELETE FROM` (WHERE 절 없이) — 절대 금지
- `ALTER TABLE DROP COLUMN` — 사용자 명시적 허가 필요

### 데이터베이스 안전 규칙
- 삭제/리셋 작업 시 반드시 사용자 승인 요청
- 삭제 전 백업 또는 복구 방법 안내
- 테스트 데이터 존재 시 DB 리셋 대신 SQL로 해결
- 운영 DB 자동 변경 절대 금지

### Git 금지 명령어
- `git push --force` — 절대 금지
- `git reset --hard` — 절대 금지
- `git clean -fd` — 사용자 확인 필요
- `git branch -D` (main/master) — 절대 금지

### 패키지 관리 금지 명령어
- `npm audit fix --force` — 절대 금지
- `rm -rf node_modules && npm install` — 사용자 확인 필요
- 메이저 버전 자동 업그레이드 — 절대 금지

### 파일 시스템 금지 명령어
- `rm -rf /` 또는 루트 경로 삭제 — 절대 금지
- 프로젝트 외부 파일 수정 — 절대 금지
- `.env` 파일 삭제 — 사용자 확인 필요
- `src/` 디렉토리 전체 삭제 — 절대 금지

### 안전 작업 원칙
- 파괴적 작업(삭제, 초기화) 전 반드시 사용자 확인
- 복구 불가능한 작업은 백업 방법 먼저 안내
- 자동화된 스크립트의 파괴적 명령 실행 금지
- 의심스러운 작업은 실행 전 사용자에게 설명 및 확인

## Architecture Constraints

### Immutable Boundaries
시스템 경계는 명확하고 불변이다.
- Frontend (`src/client/`) ↔ Backend (`src/server/`) 직접 참조 금지
- Shared (`src/shared/`)만 양방향 참조 가능
- 경계를 넘는 모든 통신은 명세된 API를 통해서만

### Single Source of Truth
각 관심사는 단 하나의 정의 위치를 갖는다.
- 타입: `src/shared/types/`
- 검증 스키마: `src/shared/validations/`
- 비즈니스 로직: `src/server/services/`
- DB 스키마: `src/server/db/schema.ts`

### No Direct Database Access from Frontend
프론트엔드는 데이터베이스에 직접 접근할 수 없다.
- **Why**: 보안, 비즈니스 로직 중복, 트랜잭션 관리 문제
- **원칙**: 모든 데이터 접근은 API를 통해서만

## Quality Standards

### Non-Negotiable Quality Gates
다음 검증을 통과하지 못하면 커밋할 수 없다.
1. TypeScript 타입 체크 통과
2. 모든 테스트 통과
3. 빌드 성공
4. 명세 문서와 일치

### Security Requirements
- 환경 변수에 민감 정보 저장, 코드에 하드코딩 금지
- SQL Injection 방지: ORM 파라미터 바인딩만 사용
- XSS 방지: 모든 입력 검증 + React 자동 이스케이핑
- 에러 메시지에 내부 구현 상세 노출 금지

## Governance

### Constitution Authority
이 Constitution은 모든 다른 개발 관행, 가이드, 제안보다 우선한다.

### Amendment Process
Constitution 수정은 다음 절차를 따른다:
1. 변경 제안 (이유, 영향 범위, 대안 분석 포함)
2. 팀 전체 검토 및 논의
3. 합의 도출
4. 영향받는 코드의 마이그레이션 계획 수립
5. 문서화 및 승인
6. 버전 업데이트

### Enforcement
- 모든 PR은 Constitution 준수 여부 검증 필수
- 위반 사항 발견 시 즉시 수정
- 예외 허용 시 문서화 및 제한적 범위 명시

### Living Document
- Constitution은 프로젝트 진화에 따라 성장한다
- 하지만 핵심 원칙(Core Principles)은 신중히 변경한다
- 실무 세부사항은 CLAUDE.md에 위임

**실무 개발 가이드는 CLAUDE.md 참조**

---

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
