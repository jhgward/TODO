import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'drizzle/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'warn',
    },
  },
  // 경계 규칙 (TRD §7): 프론트엔드 → 백엔드 import 금지
  {
    files: ['src/client/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server', '@/server/*', '**/server/**'],
              message:
                'src/client에서 src/server를 import할 수 없습니다. API(ticketApi.ts)를 통해 접근하세요.',
            },
          ],
        },
      ],
    },
  },
  // 경계 규칙 (TRD §7): 백엔드 → 프론트엔드/React import 금지
  {
    files: ['src/server/**/*.ts', 'app/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: '백엔드 코드에서 React를 사용할 수 없습니다.' },
            { name: 'react-dom', message: '백엔드 코드에서 React를 사용할 수 없습니다.' },
          ],
          patterns: [
            {
              group: ['@/client', '@/client/*', '**/client/**'],
              message: '백엔드 코드에서 src/client를 import할 수 없습니다.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
