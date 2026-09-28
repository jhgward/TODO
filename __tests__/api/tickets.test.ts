import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tickets/route';

// API_SPEC.md: Timezone Asia/Seoul 기준 YYYY-MM-DD
const seoulDate = (offsetDays: number): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000),
  );

const createRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost:3000/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('TC-API-001: POST /api/tickets — 티켓 생성', () => {
  it('001-2: 모든 필드를 포함하면 201과 함께 생성된 티켓을 반환한다', async () => {
    const input = {
      title: 'API 설계 문서 작성',
      description: 'REST API 엔드포인트와 요청/응답 형식을 정의한다',
      priority: 'HIGH',
      plannedStartDate: seoulDate(1),
      dueDate: seoulDate(7),
    };

    const res = await POST(createRequest(input));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({
      ...input,
      status: 'BACKLOG',
      startedAt: null,
      completedAt: null,
    });
    expect(typeof body.id).toBe('number');
    expect(typeof body.position).toBe('number');
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('001-1: 제목만으로 생성하면 201, status=BACKLOG, priority=MEDIUM 기본값이 적용된다', async () => {
    const res = await POST(createRequest({ title: '테스트 할일' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({
      title: '테스트 할일',
      description: null,
      status: 'BACKLOG',
      priority: 'MEDIUM',
      plannedStartDate: null,
      dueDate: null,
      startedAt: null,
      completedAt: null,
    });
  });

  it('001-3: 제목이 누락되면 400, "제목을 입력해주세요"를 반환한다', async () => {
    const res = await POST(createRequest({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' },
    });
  });

  it('001-6: 제목이 200자를 초과하면 400을 반환한다', async () => {
    const res = await POST(createRequest({ title: 'a'.repeat(201) }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '제목은 200자 이내로 입력해주세요' },
    });
  });

  it('001-9: 종료예정일이 과거이면 400을 반환한다', async () => {
    const res = await POST(createRequest({ title: 'ok', dueDate: '2020-01-01' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '종료예정일은 오늘 이후 날짜를 선택해주세요' },
    });
  });

  it('001-8: 잘못된 우선순위 값이면 400을 반환한다', async () => {
    const res = await POST(createRequest({ title: 'ok', priority: 'URGENT' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요',
      },
    });
  });
});
