import { GET } from '@/app/api/tickets/[id]/route';
import {
  idParams,
  insertTicket,
  jsonRequest,
  MISSING_ID,
  seoulDate,
} from '../helpers/ticketFixtures';

const NOT_FOUND = { error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' } };
const FORMAT_ERROR = {
  error: { code: 'VALIDATION_ERROR', message: '요청 형식이 올바르지 않습니다' },
};

const getTicket = (id: number | string) =>
  GET(jsonRequest(`/api/tickets/${id}`, 'GET'), idParams(id));

describe('TC-API-003: GET /api/tickets/:id — 티켓 상세 조회', () => {
  it('003-1: 존재하는 티켓이면 200과 함께 모든 필드를 반환한다', async () => {
    const ticket = await insertTicket({
      title: '상세 조회',
      description: '설명',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      position: 2048,
      plannedStartDate: seoulDate(1),
      dueDate: seoulDate(5),
      startedAt: new Date('2026-01-28T00:00:00.000Z'),
    });

    const res = await getTicket(ticket.id);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: ticket.id,
      title: '상세 조회',
      description: '설명',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      position: 2048,
      plannedStartDate: seoulDate(1),
      dueDate: seoulDate(5),
      startedAt: '2026-01-28T00:00:00.000Z',
      completedAt: null,
    });
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('003-2: 존재하지 않는 id이면 404, "티켓을 찾을 수 없습니다"를 반환한다', async () => {
    const res = await getTicket(MISSING_ID);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual(NOT_FOUND);
  });

  it('003-3: id가 숫자가 아니면 400 VALIDATION_ERROR를 반환한다', async () => {
    const res = await getTicket('abc');

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('003-4: isOverdue 파생 필드를 포함한다', async () => {
    const overdue = await insertTicket({ status: 'TODO', dueDate: seoulDate(-1) });
    const notOverdue = await insertTicket({ status: 'TODO', dueDate: seoulDate(1) });

    expect((await (await getTicket(overdue.id)).json()).isOverdue).toBe(true);
    expect((await (await getTicket(notOverdue.id)).json()).isOverdue).toBe(false);
  });

  it.each(['0', '-1', '1.5'])('003-5: id가 양의 정수가 아니면(%s) 400을 반환한다', async (id) => {
    const res = await getTicket(id);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });
});
