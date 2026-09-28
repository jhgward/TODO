import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';
import type { CreateTicketInput } from '@/shared/validations/tickets';

export const create = async (input: CreateTicketInput) => {
  const [ticket] = await db.insert(tickets).values(input).returning();
  return ticket;
};
