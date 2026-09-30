import { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';
import type { Ticket } from '@/shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

// API_SPEC.md: Timezone Asia/Seoul 기준 YYYY-MM-DD
export const seoulDate = (offsetDays: number): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    new Date(Date.now() + offsetDays * DAY_MS),
  );

// 존재하지 않는 티켓 id (SERIAL 최댓값)
export const MISSING_ID = 2147483647;

// API로 만들 수 없는 상태(과거 dueDate, 과거 completedAt 등)의 티켓을 tika_test에 직접 넣는다.
// constitution Guardrails에 따라 삭제·정리는 하지 않는다.
export const insertTicket = async (
  overrides: Partial<typeof tickets.$inferInsert> = {},
): Promise<Ticket> => {
  const [ticket] = await db
    .insert(tickets)
    .values({ title: 'fixture', position: 0, ...overrides })
    .returning();
  return ticket;
};

export const jsonRequest = (path: string, method: string, body?: unknown): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const rawRequest = (path: string, method: string, body: string): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body,
  });

// Next.js 15 동적 라우트의 두 번째 인자
export const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
