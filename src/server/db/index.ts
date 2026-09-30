import { drizzle } from 'drizzle-orm/postgres-js';

export const db = drizzle({
  // postgres 드라이버는 기본값으로 유휴 연결을 닫지 않아 Jest 등 프로세스가 종료되지 않는다 (단위: 초)
  connection: { url: process.env.DATABASE_URL ?? '', idle_timeout: 10 },
});
