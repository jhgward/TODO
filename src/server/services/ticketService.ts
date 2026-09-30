import { and, asc, eq, min, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';
import {
  calculateInsertPosition,
  getTimestampChanges,
  groupBoard,
  POSITION_GAP,
  withMeta,
} from '@/server/services/ticketRules';
import {
  TICKET_STATUS,
  type BoardResponse,
  type CreateTicketInput,
  type ReorderResult,
  type ReorderTicketInput,
  type Ticket,
  type TicketStatus,
  type TicketWithMeta,
  type UpdateTicketInput,
} from '@/shared/types';

// DATA_MODEL.md §5.5: 새 티켓은 칼럼 맨 위 — 비어 있으면 0, 아니면 최솟값 - 1024
export const getNextTopPosition = (minPosition: number | null): number =>
  minPosition === null ? 0 : minPosition - POSITION_GAP;

// 칼럼 맨 위에 놓을 position (숨겨진 Done 티켓도 같은 칼럼으로 본다)
const getTopPositionOf = async (status: TicketStatus): Promise<number> => {
  const [{ minPosition }] = await db
    .select({ minPosition: min(tickets.position) })
    .from(tickets)
    .where(eq(tickets.status, status));
  return getNextTopPosition(minPosition);
};

export const create = async (input: CreateTicketInput): Promise<Ticket> => {
  const [ticket] = await db
    .insert(tickets)
    .values({
      ...input,
      status: TICKET_STATUS.BACKLOG,
      position: await getTopPositionOf(TICKET_STATUS.BACKLOG),
    })
    .returning();
  return ticket;
};

export const getBoard = async (now: Date = new Date()): Promise<BoardResponse> => {
  const allTickets = await db.select().from(tickets);
  return groupBoard(allTickets, now);
};

export const getById = async (
  id: number,
  now: Date = new Date(),
): Promise<TicketWithMeta | null> => {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  return ticket ? withMeta(ticket, now) : null;
};

export const update = async (
  id: number,
  input: UpdateTicketInput,
  now: Date = new Date(),
): Promise<TicketWithMeta | null> => {
  // 바꿀 필드가 없으면 갱신하지 않는다 (updatedAt 유지)
  const hasChanges = Object.values(input).some((value) => value !== undefined);
  if (!hasChanges) return getById(id, now);

  const [ticket] = await db.update(tickets).set(input).where(eq(tickets.id, id)).returning();
  return ticket ? withMeta(ticket, now) : null;
};

export const complete = async (id: number, now: Date = new Date()): Promise<Ticket | null> => {
  const [current] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!current) return null;
  // 이미 완료된 티켓은 변경하지 않는다 (completedAt·position·updatedAt 유지)
  if (current.status === TICKET_STATUS.DONE) return current;

  const [ticket] = await db
    .update(tickets)
    .set({
      status: TICKET_STATUS.DONE,
      completedAt: now,
      position: await getTopPositionOf(TICKET_STATUS.DONE),
    })
    .where(eq(tickets.id, id))
    .returning();
  return ticket;
};

export const reorder = async (
  input: ReorderTicketInput,
  now: Date = new Date(),
): Promise<ReorderResult | null> =>
  // 이동 티켓과 재정렬 대상을 한 트랜잭션으로 갱신한다 (원자성)
  db.transaction(async (tx) => {
    const [current] = await tx.select().from(tickets).where(eq(tickets.id, input.ticketId));
    if (!current) return null;

    const others = await tx
      .select({ id: tickets.id, position: tickets.position })
      .from(tickets)
      .where(and(eq(tickets.status, input.status), ne(tickets.id, current.id)))
      .orderBy(asc(tickets.position), asc(tickets.id));
    const { position, affected } = calculateInsertPosition(others, input.position);

    const [ticket] = await tx
      .update(tickets)
      .set({
        status: input.status,
        position,
        ...getTimestampChanges(current.status, input.status, now),
      })
      .where(eq(tickets.id, current.id))
      .returning();
    for (const item of affected) {
      await tx.update(tickets).set({ position: item.position }).where(eq(tickets.id, item.id));
    }

    return { ticket, affected };
  });

// 하드 삭제. 반드시 id 조건으로 한 건만 지운다.
export const remove = async (id: number): Promise<boolean> => {
  const deleted = await db.delete(tickets).where(eq(tickets.id, id)).returning({ id: tickets.id });
  return deleted.length > 0;
};
