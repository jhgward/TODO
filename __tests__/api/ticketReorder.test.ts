import { PATCH } from '@/app/api/tickets/reorder/route';
import { GET as getBoard } from '@/app/api/tickets/route';
import type { BoardResponse, TicketStatus } from '@/shared/types';
import { HOUR_MS, insertTicket, jsonRequest, MISSING_ID } from '../helpers/ticketFixtures';

const validationError = (message: string) => ({ error: { code: 'VALIDATION_ERROR', message } });
const FORMAT_ERROR = validationError('요청 형식이 올바르지 않습니다');
const STATUS_ERROR = validationError('상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요');

const reorder = (body: unknown) => PATCH(jsonRequest('/api/tickets/reorder', 'PATCH', body));

const columnOf = async (status: TicketStatus) => {
  const board: BoardResponse = await (await getBoard()).json();
  return board.board[status];
};

describe('TC-API-007: PATCH /api/tickets/reorder — 상태/순서 변경', () => {
  const anHourAgo = new Date(Date.now() - HOUR_MS);

  it('007-1: BACKLOG 티켓을 TODO 첫 자리로 옮기면 status=TODO, TODO 맨 위에 온다', async () => {
    const ticket = await insertTicket({ title: '이동-1', status: 'BACKLOG' });

    const res = await reorder({ ticketId: ticket.id, status: 'TODO', position: 0 });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ticket).toMatchObject({ id: ticket.id, status: 'TODO' });
    expect((await columnOf('TODO'))[0].id).toBe(ticket.id);
  });

  it('007-2: 같은 칼럼 안에서 옮기면 status는 유지되고 순서만 바뀐다', async () => {
    const front = await insertTicket({ title: '이동-2 앞', status: 'IN_PROGRESS' });
    const back = await insertTicket({ title: '이동-2 뒤', status: 'IN_PROGRESS' });
    await reorder({ ticketId: front.id, status: 'IN_PROGRESS', position: 0 });

    const res = await reorder({ ticketId: back.id, status: 'IN_PROGRESS', position: 0 });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ticket.status).toBe('IN_PROGRESS');
    const ids = (await columnOf('IN_PROGRESS')).map((ticket) => ticket.id);
    expect(ids.slice(0, 2)).toEqual([back.id, front.id]);
  });

  it('007-3: BACKLOG → TODO로 옮기면 startedAt이 현재 시각으로 설정된다', async () => {
    const ticket = await insertTicket({ status: 'BACKLOG' });
    const before = Date.now();

    const body = await (await reorder({ ticketId: ticket.id, status: 'TODO', position: 0 })).json();
    const startedAt = new Date(body.ticket.startedAt).getTime();

    expect(startedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(startedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('007-4: TODO → BACKLOG로 옮기면 startedAt이 null이 된다', async () => {
    const ticket = await insertTicket({ status: 'TODO', startedAt: anHourAgo });

    const res = await reorder({ ticketId: ticket.id, status: 'BACKLOG', position: 0 });
    const body = await res.json();

    expect(body.ticket).toMatchObject({ status: 'BACKLOG', startedAt: null });
  });

  it('007-5: DONE → TODO로 옮기면 completedAt이 null이 되고 startedAt이 설정된다', async () => {
    const ticket = await insertTicket({ status: 'DONE', completedAt: anHourAgo });

    const body = await (await reorder({ ticketId: ticket.id, status: 'TODO', position: 0 })).json();

    expect(body.ticket).toMatchObject({ status: 'TODO', completedAt: null });
    expect(typeof body.ticket.startedAt).toBe('string');
  });

  it('007-6: DONE → BACKLOG로 옮기면 completedAt과 startedAt이 모두 null이 된다', async () => {
    const ticket = await insertTicket({
      status: 'DONE',
      startedAt: anHourAgo,
      completedAt: anHourAgo,
    });

    const res = await reorder({ ticketId: ticket.id, status: 'BACKLOG', position: 0 });
    const body = await res.json();

    expect(body.ticket).toMatchObject({ status: 'BACKLOG', completedAt: null, startedAt: null });
  });

  it('007-7: TODO → IN_PROGRESS로 옮기면 startedAt은 그대로다', async () => {
    const ticket = await insertTicket({ status: 'TODO', startedAt: anHourAgo });

    const res = await reorder({ ticketId: ticket.id, status: 'IN_PROGRESS', position: 0 });
    const body = await res.json();

    expect(body.ticket).toMatchObject({
      status: 'IN_PROGRESS',
      startedAt: anHourAgo.toISOString(),
    });
  });

  it('007-8: 중간(index 1)에 넣으면 두 번째 자리에 오고, affected의 position이 실제로 반영된다', async () => {
    const ticket = await insertTicket({ title: '이동-8', status: 'BACKLOG' });

    const res = await reorder({ ticketId: ticket.id, status: 'IN_PROGRESS', position: 1 });
    const body = await res.json();
    const column = await columnOf('IN_PROGRESS');

    expect(res.status).toBe(200);
    expect(column[1].id).toBe(ticket.id);
    expect(Array.isArray(body.affected)).toBe(true);
    for (const affected of body.affected) {
      expect(column.find((item) => item.id === affected.id)?.position).toBe(affected.position);
    }
    // 옮긴 티켓의 position은 앞뒤 티켓과 겹치지 않는다
    expect(column[0].position).toBeLessThan(column[1].position);
    expect(column[1].position).toBeLessThan(column[2].position);
  });

  it('007-9: status에 DONE을 보내면 400 VALIDATION_ERROR를 반환한다', async () => {
    const ticket = await insertTicket({ status: 'TODO' });

    const res = await reorder({ ticketId: ticket.id, status: 'DONE', position: 0 });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(STATUS_ERROR);
  });

  it('007-10: 잘못된 status이면 400과 상태 안내 메시지를 반환한다', async () => {
    const ticket = await insertTicket({ status: 'TODO' });

    const invalid = await reorder({ ticketId: ticket.id, status: 'INVALID', position: 0 });
    const missing = await reorder({ ticketId: ticket.id, position: 0 });

    for (const res of [invalid, missing]) {
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual(STATUS_ERROR);
    }
  });

  it('007-11: 존재하지 않는 ticketId이면 404, "티켓을 찾을 수 없습니다"를 반환한다', async () => {
    const res = await reorder({ ticketId: MISSING_ID, status: 'TODO', position: 0 });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' },
    });
  });

  it('007-12: 옮기면 updatedAt이 갱신된다', async () => {
    const ticket = await insertTicket({ status: 'BACKLOG', updatedAt: anHourAgo });

    const body = await (await reorder({ ticketId: ticket.id, status: 'TODO', position: 0 })).json();

    expect(new Date(body.ticket.updatedAt).getTime()).toBeGreaterThan(anHourAgo.getTime());
  });

  it('007-14: index가 칼럼 길이보다 크면 맨 뒤에 놓인다', async () => {
    const ticket = await insertTicket({ title: '이동-14', status: 'BACKLOG' });

    const res = await reorder({ ticketId: ticket.id, status: 'TODO', position: 999999 });
    const column = await columnOf('TODO');

    expect(res.status).toBe(200);
    expect(column[column.length - 1].id).toBe(ticket.id);
  });

  it('007-15: IN_PROGRESS → BACKLOG로 옮기면 startedAt이 null이 된다', async () => {
    const ticket = await insertTicket({ status: 'IN_PROGRESS', startedAt: anHourAgo });

    const res = await reorder({ ticketId: ticket.id, status: 'BACKLOG', position: 0 });
    const body = await res.json();

    expect(body.ticket).toMatchObject({ status: 'BACKLOG', startedAt: null });
  });

  it.each([
    ['position 음수', { status: 'TODO', position: -1 }],
    ['position 소수', { status: 'TODO', position: 1.5 }],
    ['position 누락', { status: 'TODO' }],
  ])('007-17: %s이면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async (_name, rest) => {
    const ticket = await insertTicket({ status: 'BACKLOG' });

    const res = await reorder({ ticketId: ticket.id, ...rest });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('007-17: ticketId가 숫자가 아니면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const res = await reorder({ ticketId: 'abc', status: 'TODO', position: 0 });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('007-18: 재정렬이 없는 이동은 { ticket, affected: [] }를 반환하고 ticket에 isOverdue가 없다', async () => {
    const ticket = await insertTicket({ status: 'BACKLOG' });

    const body = await (await reorder({ ticketId: ticket.id, status: 'TODO', position: 0 })).json();

    expect(Object.keys(body).sort()).toEqual(['affected', 'ticket']);
    expect(body.affected).toEqual([]);
    expect(body.ticket).not.toHaveProperty('isOverdue');
  });
});

describe('TC-API-007: PATCH /api/tickets/reorder — ticketId 범위', () => {
  it('007-19: ticketId가 정수 범위를 넘으면 500이 아니라 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const res = await reorder({ ticketId: 99999999999, status: 'TODO', position: 0 });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });
});
