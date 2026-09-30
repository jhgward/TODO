import { DELETE, GET } from '@/app/api/tickets/[id]/route';
import { idParams, insertTicket, jsonRequest, MISSING_ID } from '../helpers/ticketFixtures';

const NOT_FOUND = { error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' } };

const deleteTicket = (id: number | string) =>
  DELETE(jsonRequest(`/api/tickets/${id}`, 'DELETE'), idParams(id));

describe('TC-API-006: DELETE /api/tickets/:id — 티켓 삭제', () => {
  it('006-1: 삭제하면 204(본문 없음)이고, 다시 조회하면 404다', async () => {
    const ticket = await insertTicket({ title: '삭제 대상' });

    const res = await deleteTicket(ticket.id);

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');

    const again = await GET(jsonRequest(`/api/tickets/${ticket.id}`, 'GET'), idParams(ticket.id));
    expect(again.status).toBe(404);
    expect(await again.json()).toEqual(NOT_FOUND);
  });

  it('006-1 보충: 삭제한 티켓만 지워지고 다른 티켓은 남아 있다', async () => {
    const target = await insertTicket({ title: '삭제 대상' });
    const other = await insertTicket({ title: '남는 티켓' });

    await deleteTicket(target.id);

    const res = await GET(jsonRequest(`/api/tickets/${other.id}`, 'GET'), idParams(other.id));
    expect(res.status).toBe(200);
  });

  it('006-2: 존재하지 않는 id이면 404, "티켓을 찾을 수 없습니다"를 반환한다', async () => {
    const res = await deleteTicket(MISSING_ID);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual(NOT_FOUND);
  });

  it('006-2 보충: 이미 삭제한 티켓을 다시 삭제하면 404다', async () => {
    const ticket = await insertTicket({ title: '삭제 대상' });
    await deleteTicket(ticket.id);

    const res = await deleteTicket(ticket.id);

    expect(res.status).toBe(404);
  });

  it('006-3: id가 숫자가 아니면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const res = await deleteTicket('abc');

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '요청 형식이 올바르지 않습니다' },
    });
  });
});
