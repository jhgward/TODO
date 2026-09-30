# 2026-09-28 Jest 테스트 환경 점검

## 요청
Next.js 15 App Router 호환, TypeScript strict, @testing-library/react + jest-dom, `@/` → `src/`

## 결론
스캐폴딩 때 구성한 설정이 요구사항을 이미 충족 → 설정 변경 없음.

| 요구사항 | 구성 |
|----------|------|
| Next.js 15 호환 | `jest.config.ts`가 `next/jest` 사용 (SWC 변환, `.env.test` 로드, CSS/이미지 mock) |
| TS strict | `tsconfig.json` `strict: true`. Jest(SWC)는 타입 검사를 하지 않으므로 타입 검사는 `npx tsc --noEmit` |
| RTL + jest-dom | client 프로젝트(jsdom)에서 `jest.setup.ts`로 jest-dom 매처 등록, tsconfig `types`에 포함 |
| `@/` → `src/` | tsconfig paths + jest moduleNameMapper. 예외로 `@/app/*` → `app/*` (API 테스트 import용) |

## 실행한 명령어
| 명령어 | 의미 / 사용 이유 |
|--------|------------------|
| `cat > __tests__/components/zz_probe.test.tsx <<'EOF' ...` | jsdom·RTL·jest-dom·`@/` 별칭을 한 번에 확인하는 임시 테스트 생성 |
| `npx jest` | server(node)·client(jsdom) 두 프로젝트 실행 → 7 passed |
| `npx tsc --noEmit` | strict 모드에서 TSX 테스트·jest-dom 타입 인식 확인 |
| `rm __tests__/components/zz_probe.test.tsx` | 임시 테스트 삭제 (테스트 코드는 사용자가 Red 단계에서 작성) |

## 이전 작업 상태 (중단됨)
- 적용: `@vercel/postgres` 제거, `lint` 스크립트 `eslint .`, `app/(board)/layout.tsx` 생성
- 미적용(거부): TRD·CLAUDE.md·README의 DB 드라이버/환경 변수 문서 수정
