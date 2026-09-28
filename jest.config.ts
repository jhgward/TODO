import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const moduleNameMapper = {
  '^@/app/(.*)$': '<rootDir>/app/$1',
  '^@/(.*)$': '<rootDir>/src/$1',
};

// 백엔드: API Route + 서비스 테스트 (Node 환경)
const serverConfig = createJestConfig({
  displayName: 'server',
  testEnvironment: 'node',
  moduleNameMapper,
  testMatch: ['<rootDir>/__tests__/{api,services}/**/*.test.{ts,tsx}'],
});

// 프론트엔드: 컴포넌트 + Hook 테스트 (jsdom 환경)
const clientConfig = createJestConfig({
  displayName: 'client',
  testEnvironment: 'jsdom',
  moduleNameMapper,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/__tests__/{components,hooks}/**/*.test.{ts,tsx}'],
});

const config = async (): Promise<Config> => ({
  passWithNoTests: true,
  projects: [await serverConfig(), await clientConfig()],
});

export default config;
