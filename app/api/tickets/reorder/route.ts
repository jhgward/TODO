import { NextRequest, NextResponse } from 'next/server';
import { notFoundResponse, withErrorHandler } from '@/server/middleware/errorHandler';
import { validateBody } from '@/server/middleware/validate';
import * as ticketService from '@/server/services/ticketService';
import { reorderTicketSchema } from '@/shared/validations/tickets';

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const validation = await validateBody(request, reorderTicketSchema);
  if (!validation.success) return validation.response;

  const result = await ticketService.reorder(validation.data);
  return result ? NextResponse.json(result) : notFoundResponse();
});
