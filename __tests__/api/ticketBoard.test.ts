import { GET } from '@/app/api/tickets/route';
import type { BoardResponse, Ticket, TicketStatus } from '@/shared/types';
import { HOUR_MS, insertTicket, seoulDate } from '../helpers/ticketFixtures';

const COLUMNS: TicketStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];

describe('TC-API-002: GET /api/tickets — 보드 조회', () => {
  let status: number;
  let body: BoardResponse;
  let overdueBacklog: Ticket;
  let inProgress: Ticket;
  let doneRecent: Ticket;
  let doneOld: Ticket;

  const idsOf = (column: TicketStatus) => body.board[column].map((ticket) => ticket.id);

  beforeAll(async () => {
    overdueBacklog = await insertTicket({
      title: '보드-오버듀',
      status: 'BACKLOG',
      plannedStartDate: seoulDate(-3),
      dueDate: seoulDate(-1),
    });
    inProgress = await insertTicket({ title: '보드-진행중', status: 'IN_PROGRESS' });
    doneRecent = await insertTicket({
      title: '보드-23시간 전 완료',
      status: 'DONE',
      completedAt: new Date(Date.now() - 23 * HOUR_MS),
    });
    doneOld = await insertTicket({
      title: '보드-25시간 전 완료',
      status: 'DONE',
      completedAt: new Date(Date.now() - 25 * HOUR_MS),
    });

    const res = await GET();
    status = res.status;
    body = await res.json();
  });

  it('002-1 보충: 200과 함께 네 칼럼 키를 항상 포함한다', () => {
    expect(status).toBe(200);
    expect(Object.keys(body.board).sort()).toEqual([...COLUMNS].sort());
    COLUMNS.forEach((column) => expect(Array.isArray(body.board[column])).toBe(true));
  });

  it('002-2: 티켓이 자기 상태의 칼럼에만 나타난다', () => {
    expect(idsOf('BACKLOG')).toContain(overdueBacklog.id);
    expect(idsOf('IN_PROGRESS')).toContain(inProgress.id);
    expect(idsOf('DONE')).toContain(doneRecent.id);

    COLUMNS.forEach((column) => {
      body.board[column].forEach((ticket) => expect(ticket.status).toBe(column));
    });
  });

  it('002-3: 각 칼럼은 position 오름차순으로 정렬된다', () => {
    COLUMNS.forEach((column) => {
      const positions = body.board[column].map((ticket) => ticket.position);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
  });

  it('002-4: total은 표시되는 전체 티켓 수다', () => {
    const shown = COLUMNS.reduce((sum, column) => sum + body.board[column].length, 0);
    expect(body.total).toBe(shown);
  });

  it('002-5: 완료한 지 24시간 이내인 티켓은 Done 칼럼에 포함된다', () => {
    expect(idsOf('DONE')).toContain(doneRecent.id);
  });

  it('002-6: 완료한 지 24시간이 지난 티켓은 Done 칼럼에서 제외된다', () => {
    expect(idsOf('DONE')).not.toContain(doneOld.id);
  });

  it('002-7: 모든 티켓에 isOverdue가 있고, 종료예정일이 지난 미완료 티켓은 true다', () => {
    COLUMNS.forEach((column) => {
      body.board[column].forEach((ticket) => expect(typeof ticket.isOverdue).toBe('boolean'));
    });

    const found = body.board.BACKLOG.find((ticket) => ticket.id === overdueBacklog.id);
    expect(found?.isOverdue).toBe(true);
    body.board.DONE.forEach((ticket) => expect(ticket.isOverdue).toBe(false));
  });

  it('002-8: 모든 날짜 필드를 포함한다', () => {
    const found = body.board.BACKLOG.find((ticket) => ticket.id === overdueBacklog.id);

    expect(found).toMatchObject({
      plannedStartDate: seoulDate(-3),
      dueDate: seoulDate(-1),
      startedAt: null,
      completedAt: null,
    });
    const recent = body.board.DONE.find((ticket) => ticket.id === doneRecent.id);
    expect(typeof recent?.completedAt).toBe('string');
  });
});
