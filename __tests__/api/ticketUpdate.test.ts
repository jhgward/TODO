import { PATCH } from '@/app/api/tickets/[id]/route';
import type { Ticket } from '@/shared/types';
import {
  HOUR_MS,
  idParams,
  insertTicket,
  jsonRequest,
  MISSING_ID,
  rawRequest,
  seoulDate,
} from '../helpers/ticketFixtures';

const validationError = (message: string) => ({ error: { code: 'VALIDATION_ERROR', message } });
const FORMAT_ERROR = validationError('요청 형식이 올바르지 않습니다');

const patchTicket = (id: number | string, body: unknown) =>
  PATCH(jsonRequest(`/api/tickets/${id}`, 'PATCH', body), idParams(id));

describe('TC-API-004: PATCH /api/tickets/:id — 티켓 수정', () => {
  let ticket: Ticket;
  const anHourAgo = new Date(Date.now() - HOUR_MS);

  beforeEach(async () => {
    ticket = await insertTicket({
      title: '수정 전 제목',
      description: '수정 전 설명',
      status: 'TODO',
      priority: 'HIGH',
      position: 4096,
      plannedStartDate: seoulDate(1),
      dueDate: seoulDate(5),
      startedAt: anHourAgo,
      updatedAt: anHourAgo,
    });
  });

  it('004-1: 제목만 수정하면 제목만 바뀌고 나머지는 유지된다', async () => {
    const res = await patchTicket(ticket.id, { title: '새 제목' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: ticket.id,
      title: '새 제목',
      description: '수정 전 설명',
      status: 'TODO',
      priority: 'HIGH',
      position: 4096,
      plannedStartDate: seoulDate(1),
      dueDate: seoulDate(5),
      startedAt: anHourAgo.toISOString(),
      completedAt: null,
    });
  });

  it('004-2: 우선순위를 변경한다', async () => {
    const res = await patchTicket(ticket.id, { priority: 'LOW' });

    expect(res.status).toBe(200);
    expect((await res.json()).priority).toBe('LOW');
  });

  it('004-3: description에 null을 보내면 설명이 삭제된다', async () => {
    const res = await patchTicket(ticket.id, { description: null });

    expect(res.status).toBe(200);
    expect((await res.json()).description).toBeNull();
  });

  it('004-4: dueDate에 null을 보내면 종료예정일이 삭제된다', async () => {
    const res = await patchTicket(ticket.id, { dueDate: null });

    expect(res.status).toBe(200);
    expect((await res.json()).dueDate).toBeNull();
  });

  it('004-5: 시작예정일을 수정한다', async () => {
    const res = await patchTicket(ticket.id, { plannedStartDate: '2026-03-01' });

    expect(res.status).toBe(200);
    expect((await res.json()).plannedStartDate).toBe('2026-03-01');
  });

  it('004-6: plannedStartDate에 null을 보내면 시작예정일이 삭제된다', async () => {
    const res = await patchTicket(ticket.id, { plannedStartDate: null });

    expect(res.status).toBe(200);
    expect((await res.json()).plannedStartDate).toBeNull();
  });

  it('004-7: 존재하지 않는 id이면 404, "티켓을 찾을 수 없습니다"를 반환한다', async () => {
    const res = await patchTicket(MISSING_ID, { title: '새 제목' });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' },
    });
  });

  it('004-8: 수정하면 updatedAt이 갱신된다', async () => {
    const res = await patchTicket(ticket.id, { title: '새 제목' });
    const body = await res.json();

    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(anHourAgo.getTime());
  });

  it('004-9: status 등 시스템 필드는 보내도 무시된다', async () => {
    const res = await patchTicket(ticket.id, {
      title: 'x',
      status: 'DONE',
      position: 1,
      startedAt: null,
      completedAt: '2026-01-01T00:00:00.000Z',
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      title: 'x',
      status: 'TODO',
      position: 4096,
      startedAt: anHourAgo.toISOString(),
      completedAt: null,
    });
  });

  it.each(['', '  '])('004-10: 제목을 빈 값("%s")으로 수정하면 400을 반환한다', async (title) => {
    const res = await patchTicket(ticket.id, { title });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(validationError('제목을 입력해주세요'));
  });

  it.each([
    ['오늘 종료예정일', { dueDate: seoulDate(0) }, '종료예정일은 오늘 이후 날짜를 선택해주세요'],
    ['201자 제목', { title: 'a'.repeat(201) }, '제목은 200자 이내로 입력해주세요'],
    ['1001자 설명', { description: 'a'.repeat(1001) }, '설명은 1000자 이내로 입력해주세요'],
    ['잘못된 우선순위', { priority: 'URGENT' }, '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요'],
  ])('004-11: %s이면 생성과 같은 메시지로 400을 반환한다', async (_name, body, message) => {
    const res = await patchTicket(ticket.id, body);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(validationError(message));
  });

  it('004-12: 빈 본문이면 변경 없이 200을 반환하고 updatedAt을 유지한다', async () => {
    const res = await patchTicket(ticket.id, {});
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ title: '수정 전 제목', priority: 'HIGH' });
    expect(body.updatedAt).toBe(anHourAgo.toISOString());
  });

  it('004-13: 응답에 isOverdue를 포함한다', async () => {
    const res = await patchTicket(ticket.id, { priority: 'LOW' });

    expect((await res.json()).isOverdue).toBe(false);
  });

  it('004-14: 형식이 잘못된 요청이면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const nullTitle = await patchTicket(ticket.id, { title: null });
    const badDate = await patchTicket(ticket.id, { dueDate: '2026/10/01' });
    const notJson = await PATCH(
      rawRequest(`/api/tickets/${ticket.id}`, 'PATCH', 'not json'),
      idParams(ticket.id),
    );
    const badId = await patchTicket('abc', { title: '새 제목' });

    for (const res of [nullTitle, badDate, notJson, badId]) {
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual(FORMAT_ERROR);
    }
  });
});
