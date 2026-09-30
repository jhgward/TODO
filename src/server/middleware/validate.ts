import type { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { errorResponse } from '@/server/middleware/errorHandler';
import { REQUEST_FORMAT_ERROR_MESSAGE, ticketIdSchema } from '@/shared/validations/common';

type ValidationResult<T> = { success: true; data: T } | { success: false; response: NextResponse };

// 요청 본문 JSON 파싱 + Zod 검증. 실패 시 400 VALIDATION_ERROR 응답을 돌려준다 (첫 번째 오류만)
export const validateBody = async <T>(
  request: NextRequest,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<ValidationResult<T>> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: errorResponse('VALIDATION_ERROR', REQUEST_FORMAT_ERROR_MESSAGE, 400),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: errorResponse('VALIDATION_ERROR', result.error.issues[0].message, 400),
    };
  }
  return { success: true, data: result.data };
};

type TicketIdResult = { success: true; id: number } | { success: false; response: NextResponse };

// 경로 파라미터 :id 검증. 양의 정수가 아니면 400 VALIDATION_ERROR
export const validateTicketId = (rawId: string): TicketIdResult => {
  const result = ticketIdSchema.safeParse(rawId);
  if (!result.success) {
    return {
      success: false,
      response: errorResponse('VALIDATION_ERROR', result.error.issues[0].message, 400),
    };
  }
  return { success: true, id: result.data };
};
