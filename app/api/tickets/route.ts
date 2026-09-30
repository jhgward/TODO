import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/server/middleware/errorHandler';
import { validateBody } from '@/server/middleware/validate';
import * as ticketService from '@/server/services/ticketService';
import { createTicketSchema } from '@/shared/validations/tickets';

export const GET = withErrorHandler(async () => {
  const board = await ticketService.getBoard();
  return NextResponse.json(board);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const validation = await validateBody(request, createTicketSchema);
  if (!validation.success) return validation.response;

  const ticket = await ticketService.create(validation.data);
  return NextResponse.json(ticket, { status: 201 });
});
