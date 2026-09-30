import { z } from 'zod';

// 본문 해석 불가·자료형 불일치·날짜 형식 오류 공통 메시지 (REQUIREMENTS.md FR-001)
export const REQUEST_FORMAT_ERROR_MESSAGE = '요청 형식이 올바르지 않습니다';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// YYYY-MM-DD 형식이면서 달력에 실제로 존재하는 날짜인지 (예: 2026-02-30 거부)
export const isValidDateString = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const MAX_TICKET_ID = 2147483647; // PostgreSQL SERIAL(int4) 최댓값

// 경로 파라미터 :id — 양의 정수 문자열만 허용
export const ticketIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, REQUEST_FORMAT_ERROR_MESSAGE)
  .transform(Number)
  .refine((id) => id <= MAX_TICKET_ID, REQUEST_FORMAT_ERROR_MESSAGE);
