import {
  COLUMN_ORDER,
  TICKET_STATUS,
  type AffectedTicket,
  type BoardData,
  type BoardResponse,
  type Ticket,
  type TicketStatus,
  type TicketWithMeta,
} from '@/shared/types';

// DB를 모르는 비즈니스 규칙 (DATA_MODEL.md §5). 현재 시각·오늘 날짜를 인자로 받아 단위 테스트가 가능하다.

const DONE_VISIBLE_MS = 24 * 60 * 60 * 1000;

// API_SPEC.md: Timezone Asia/Seoul 기준 YYYY-MM-DD
export const todayInSeoul = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);

// §5.3 오버듀: 종료예정일이 오늘보다 이전이고 DONE이 아님
export const isOverdue = (ticket: Pick<Ticket, 'dueDate' | 'status'>, today: string): boolean =>
  ticket.dueDate !== null && ticket.status !== TICKET_STATUS.DONE && ticket.dueDate < today;

// §5.4 Done 칼럼 24시간 필터: completedAt이 24시간 이내
export const isDoneVisible = (ticket: Pick<Ticket, 'status' | 'completedAt'>, now: Date): boolean =>
  ticket.status === TICKET_STATUS.DONE &&
  ticket.completedAt !== null &&
  now.getTime() - ticket.completedAt.getTime() <= DONE_VISIBLE_MS;

export const withMeta = (ticket: Ticket, now: Date): TicketWithMeta => ({
  ...ticket,
  isOverdue: isOverdue(ticket, todayInSeoul(now)),
});

// 보드 구성: 칼럼별 그룹화, position 오름차순(같으면 id 순), Done 24시간 필터, total
export const groupBoard = (tickets: Ticket[], now: Date): BoardResponse => {
  const board: BoardData = { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] };

  [...tickets]
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .filter((ticket) => ticket.status !== TICKET_STATUS.DONE || isDoneVisible(ticket, now))
    .forEach((ticket) => board[ticket.status].push(withMeta(ticket, now)));

  const total = COLUMN_ORDER.reduce((sum, status) => sum + board[status].length, 0);
  return { board, total };
};

export const POSITION_GAP = 1024;

// §5.5 요청한 인덱스(이동 티켓을 제외한 칼럼 기준, position 오름차순) → 실제 position.
// 인접 카드 사이에 넣을 정수가 없으면 칼럼 전체를 0부터 1024 간격으로 다시 매기고,
// position이 바뀐 다른 티켓을 affected로 돌려준다.
export const calculateInsertPosition = (
  others: AffectedTicket[],
  index: number,
): { position: number; affected: AffectedTicket[] } => {
  if (others.length === 0) return { position: 0, affected: [] };
  if (index <= 0) return { position: others[0].position - POSITION_GAP, affected: [] };
  if (index >= others.length) {
    return { position: others[others.length - 1].position + POSITION_GAP, affected: [] };
  }

  const prev = others[index - 1].position;
  const next = others[index].position;
  if (next - prev >= 2) return { position: Math.floor((prev + next) / 2), affected: [] };

  const affected = others
    .map((ticket, i) => ({ ticket, position: (i < index ? i : i + 1) * POSITION_GAP }))
    .filter(({ ticket, position }) => ticket.position !== position)
    .map(({ ticket, position }) => ({ id: ticket.id, position }));
  return { position: index * POSITION_GAP, affected };
};

// §5.1, §5.2 칼럼 이동에 따른 시작일·종료일 변경. 키가 없으면 변경하지 않는다.
export const getTimestampChanges = (
  from: TicketStatus,
  to: TicketStatus,
  now: Date,
): { startedAt?: Date | null; completedAt?: null } => {
  if (from === to) return {};

  const changes: { startedAt?: Date | null; completedAt?: null } = {};
  if (to === TICKET_STATUS.TODO) changes.startedAt = now;
  if (to === TICKET_STATUS.BACKLOG) changes.startedAt = null;
  if (from === TICKET_STATUS.DONE) changes.completedAt = null;
  return changes;
};
