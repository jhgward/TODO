import { NextResponse } from 'next/server';

// API_SPEC.md 공통 규칙: 에러 코드 정의
export type ErrorCode = 'VALIDATION_ERROR' | 'TICKET_NOT_FOUND' | 'INTERNAL_ERROR';

export const errorResponse = (code: ErrorCode, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

// 예외 원문(스택, DB 오류)은 응답에 포함하지 않는다 (constitution III)
export const handleUnexpectedError = () =>
  errorResponse('INTERNAL_ERROR', '서버 내부 오류가 발생했습니다', 500);

export const notFoundResponse = () =>
  errorResponse('TICKET_NOT_FOUND', '티켓을 찾을 수 없습니다', 404);

// Route Handler를 감싸 예상하지 못한 예외를 500 INTERNAL_ERROR 응답으로 바꾼다
export const withErrorHandler =
  <Args extends unknown[]>(handler: (...args: Args) => Promise<NextResponse>) =>
  async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch {
      return handleUnexpectedError();
    }
  };
