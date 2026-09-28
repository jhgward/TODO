import { NextRequest, NextResponse } from 'next/server';
import * as ticketService from '@/server/services/ticketService';
import { createTicketSchema } from '@/shared/validations/tickets';

export const POST = async (request: NextRequest) => {
  const result = createTicketSchema.safeParse(await request.json());

  if (!result.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: result.error.issues[0].message } },
      { status: 400 },
    );
  }

  const ticket = await ticketService.create(result.data);
  return NextResponse.json(ticket, { status: 201 });
};
