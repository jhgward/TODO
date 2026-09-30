import { NextRequest, NextResponse } from 'next/server';
import { notFoundResponse, withErrorHandler } from '@/server/middleware/errorHandler';
import { validateBody, validateTicketId } from '@/server/middleware/validate';
import * as ticketService from '@/server/services/ticketService';
import { updateTicketSchema } from '@/shared/validations/tickets';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteContext) => {
  const validation = validateTicketId((await params).id);
  if (!validation.success) return validation.response;

  const ticket = await ticketService.getById(validation.id);
  return ticket ? NextResponse.json(ticket) : notFoundResponse();
});

export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
  const idValidation = validateTicketId((await params).id);
  if (!idValidation.success) return idValidation.response;

  const bodyValidation = await validateBody(request, updateTicketSchema);
  if (!bodyValidation.success) return bodyValidation.response;

  const ticket = await ticketService.update(idValidation.id, bodyValidation.data);
  return ticket ? NextResponse.json(ticket) : notFoundResponse();
});

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteContext) => {
  const validation = validateTicketId((await params).id);
  if (!validation.success) return validation.response;

  const removed = await ticketService.remove(validation.id);
  return removed ? new NextResponse(null, { status: 204 }) : notFoundResponse();
});
