# 2026-09-28 프로젝트 스캐폴딩

## 목적
TDD(Red 단계부터 직접 진행)를 위해 디렉터리 구조, 의존성, 설정 파일만 준비한다.
구현 코드와 테스트 코드는 작성하지 않았다.

## 생성한 것
- 디렉터리 (빈 폴더는 `.gitkeep`): `app/api/tickets/{[id]/complete,reorder}`, `app/(board)`,
  `src/server/{services,db,middleware}`, `src/client/{components/{board,ticket,ui},hooks,api}`,
  `src/shared/{types,validations}`, `__tests__/{api,services,components,hooks}`, `drizzle/`
- `package.json`: README의 npm 스크립트, TRD §2 버전 기준 의존성
- 설정: `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `jest.config.ts`, `jest.setup.ts`,
  `drizzle.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.env.example`, `.gitignore`

## 결정 사항
- **app/ 뼈대 파일**: 처음에는 만들지 않았다가 이후 요청으로 최소 뼈대만 추가했다 (아래 "추가 작업" 참고).
- **Tailwind 4**: CSS 기반 설정이라 TRD에 나온 `tailwind.config.ts`는 만들지 않고 `postcss.config.mjs`만 둔다. `app/globals.css`의 `@import 'tailwindcss';`로 로드한다.
- **path alias**: `@/*` → `src/*` (tsconfig + jest moduleNameMapper). 예: `@/shared/types`.
- **Jest projects 분리**: `server`(`__tests__/api`, `__tests__/services`, node 환경) / `client`(`__tests__/components`, `__tests__/hooks`, jsdom + jest-dom). 테스트 파일명은 `*.test.ts(x)`. `passWithNoTests: true`.
- **경계 규칙 ESLint 강제** (TRD §7): `src/client`에서 server import 시 에러, `src/server`·`app/api`에서 client 및 react/react-dom import 시 에러.
- **drizzle.config.ts**: `.env.local`의 `POSTGRES_URL`을 dotenv로 로드. 스키마 경로는 `src/server/db/schema.ts`(아직 없음).

## 검증 결과
- `npx tsc --noEmit` 통과
- `npm test` → "No tests found", exit 0 / server·client 두 project 인식 확인
- `npm run lint` 통과, 경계 규칙은 임시 파일로 양방향 에러 발생 확인 후 삭제
- `npx prettier --check .` 통과

## 추가 작업: app/ 최소 뼈대
`npm run build`/`dev`가 동작하도록 기능 코드 없는 뼈대만 추가했다.
- `app/layout.tsx`: html(lang="ko")/body + metadata(title "Tika"), globals.css import
- `app/globals.css`: `@import 'tailwindcss';`
- `app/(board)/page.tsx`: 빈 `<main />`만 렌더링 (보드 구현은 TDD로 진행)
- 검증: `npm run build` 성공 (`/` 정적 페이지 생성), tsc·lint·prettier·jest 모두 통과

## 참고 / 후속 과제
- `@vercel/postgres`는 deprecated 경고가 나온다 (Vercel Postgres → Neon 이전). 명세대로 유지했으며, 교체 시 `@neondatabase/serverless` + `drizzle-orm/neon-http` 검토.
- `next lint`는 Next.js 16에서 제거 예정이라는 경고가 나온다.
- `docs/TEXT_CASES.md` 파일명 오타는 그대로 두었다.
