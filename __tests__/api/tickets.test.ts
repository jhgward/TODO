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

describe('TC-API-001: POST /api/tickets — 제목·position 규칙 (US1)', () => {
  it('001-4: 빈 제목이면 400, "제목을 입력해주세요"를 반환한다', async () => {
    const res = await POST(createRequest({ title: '' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' },
    });
  });

  it('001-5: 공백만 있는 제목이면 400, "제목을 입력해주세요"를 반환한다', async () => {
    const res = await POST(createRequest({ title: '   ' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' },
    });
  });

  it('001-10: 연속으로 생성하면 나중 티켓의 position이 1024 더 작다 (맨 위 배치)', async () => {
    const first = await (await POST(createRequest({ title: '먼저 생성' }))).json();
    const second = await (await POST(createRequest({ title: '나중 생성' }))).json();

    expect(second.position).toBe(first.position - 1024);
  });

  it('001-11: 생성 직후 startedAt, completedAt은 null이다', async () => {
    const res = await POST(createRequest({ title: '초기값 확인' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });

  it('001-17: 제목이 정확히 200자이면 201로 생성된다', async () => {
    const res = await POST(createRequest({ title: 'a'.repeat(200) }));

    expect(res.status).toBe(201);
  });

  it('001-2 보충: 제목의 앞뒤 공백은 제거되어 저장된다', async () => {
    const res = await POST(createRequest({ title: '  할일  ' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.title).toBe('할일');
  });
});

describe('TC-API-001: POST /api/tickets — 설명·종료예정일 규칙 (US2)', () => {
  it('001-7: 설명이 1000자를 초과하면 400을 반환한다', async () => {
    const res = await POST(createRequest({ title: 'ok', description: 'a'.repeat(1001) }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '설명은 1000자 이내로 입력해주세요' },
    });
  });

  it('001-17: 설명이 정확히 1000자이면 201로 생성된다', async () => {
    const res = await POST(createRequest({ title: 'ok', description: 'a'.repeat(1000) }));

    expect(res.status).toBe(201);
  });

  it('001-12: 종료예정일이 오늘(Asia/Seoul)이면 400을 반환한다', async () => {
    const res = await POST(createRequest({ title: 'ok', dueDate: seoulDate(0) }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '종료예정일은 오늘 이후 날짜를 선택해주세요' },
    });
  });

  it('001-13: 종료예정일이 내일(Asia/Seoul)이면 201로 생성된다', async () => {
    const dueDate = seoulDate(1);
    const res = await POST(createRequest({ title: 'ok', dueDate }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.dueDate).toBe(dueDate);
  });
});

describe('TC-API-001: POST /api/tickets — 형식이 잘못된 요청 (US3)', () => {
  const FORMAT_ERROR = {
    error: { code: 'VALIDATION_ERROR', message: '요청 형식이 올바르지 않습니다' },
  };

  const createRawRequest = (body: string): NextRequest =>
    new NextRequest('http://localhost:3000/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

  it('001-14: JSON이 아닌 본문이면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const res = await POST(createRawRequest('not json'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('001-14: 본문이 객체가 아닌 배열이면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const res = await POST(createRequest([]));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('001-15: 제목이 문자열이 아니면 400, "요청 형식이 올바르지 않습니다"를 반환한다', async () => {
    const res = await POST(createRequest({ title: 123 }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('001-16: 종료예정일이 YYYY-MM-DD 형식이 아니면 400을 반환한다', async () => {
    const res = await POST(createRequest({ title: 'ok', dueDate: '2026/10/01' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('001-16: 시작예정일이 존재하지 않는 날짜이면 400을 반환한다', async () => {
    const res = await POST(createRequest({ title: 'ok', plannedStartDate: '2026-02-30' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(FORMAT_ERROR);
  });

  it('001-18: 상태·순서·시작일 같은 시스템 필드를 보내도 무시된다', async () => {
    const res = await POST(
      createRequest({
        title: 'ok',
        status: 'DONE',
        position: 999,
        startedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('BACKLOG');
    expect(body.startedAt).toBeNull();
    expect(body.position).not.toBe(999);
  });
});
