import { PATCH } from '@/app/api/tickets/[id]/complete/route';
import {
  HOUR_MS,
  idParams,
  insertTicket,
  jsonRequest,
  MISSING_ID,
} from '../helpers/ticketFixtures';

const completeTicket = (id: number | string) =>
  PATCH(jsonRequest(`/api/tickets/${id}/complete`, 'PATCH'), idParams(id));

describe('TC-API-005: PATCH /api/tickets/:id/complete — 티켓 완료', () => {
  const anHourAgo = new Date(Date.now() - HOUR_MS);

  const insertTodo = () =>
    insertTicket({
      title: '완료 대상',
      status: 'TODO',
      startedAt: anHourAgo,
      updatedAt: anHourAgo,
    });

  it('005-1: 완료 처리하면 200, status=DONE, completedAt이 설정된다', async () => {
    const ticket = await insertTodo();

    const res = await completeTicket(ticket.id);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: ticket.id,
      title: '완료 대상',
      status: 'DONE',
      startedAt: anHourAgo.toISOString(),
    });
    expect(typeof body.completedAt).toBe('string');
    expect(body).not.toHaveProperty('isOverdue');
  });

  it('005-2: completedAt은 현재 시각으로 설정된다', async () => {
    const ticket = await insertTodo();
    const before = Date.now();

    const body = await (await completeTicket(ticket.id)).json();
    const completedAt = new Date(body.completedAt).getTime();

    expect(completedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(completedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('005-3: 나중에 완료한 티켓이 Done 칼럼 맨 위(position − 1024)에 배치된다', async () => {
    const first = await (await completeTicket((await insertTodo()).id)).json();
    const second = await (await completeTicket((await insertTodo()).id)).json();

    expect(second.position).toBe(first.position - 1024);
  });

  it('005-4: 존재하지 않는 id이면 404, "티켓을 찾을 수 없습니다"를 반환한다', async () => {
    const res = await completeTicket(MISSING_ID);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' },
    });
  });

  it('005-5: 완료 처리하면 updatedAt이 갱신된다', async () => {
    const ticket = await insertTodo();

    const body = await (await completeTicket(ticket.id)).json();

    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(anHourAgo.getTime());
  });

  it('005-6: 이미 DONE인 티켓을 다시 완료 처리하면 변경 없이 200을 반환한다', async () => {
    const ticket = await insertTodo();
    const first = await (await completeTicket(ticket.id)).json();

    const res = await completeTicket(ticket.id);
    const second = await res.json();

    expect(res.status).toBe(200);
    expect(second).toEqual(first);
  });

  it('005-8: id가 숫자가 아니면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const res = await completeTicket('abc');

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '요청 형식이 올바르지 않습니다' },
    });
  });
});
