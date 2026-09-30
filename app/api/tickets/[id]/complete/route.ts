import { NextRequest, NextResponse } from 'next/server';
import { notFoundResponse, withErrorHandler } from '@/server/middleware/errorHandler';
import { validateTicketId } from '@/server/middleware/validate';
import * as ticketService from '@/server/services/ticketService';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandler(async (_request: NextRequest, { params }: RouteContext) => {
  const validation = validateTicketId((await params).id);
  if (!validation.success) return validation.response;

  const ticket = await ticketService.complete(validation.id);
  return ticket ? NextResponse.json(ticket) : notFoundResponse();
});
