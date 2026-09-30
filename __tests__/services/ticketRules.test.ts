import { groupBoard, isDoneVisible, isOverdue } from '@/server/services/ticketRules';
import type { Ticket } from '@/shared/types';

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date('2026-09-30T03:00:00.000Z'); // Asia/Seoul 2026-09-30 12:00
const TODAY = '2026-09-30';
const YESTERDAY = '2026-09-29';
const TOMORROW = '2026-10-01';

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  title: 'ticket',
  description: null,
  status: 'BACKLOG',
  priority: 'MEDIUM',
  position: 0,
  plannedStartDate: null,
  dueDate: null,
  startedAt: null,
  completedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

describe('TC-API-008: isOverdue 필드 계산', () => {
  it('008-1: 종료예정일이 지난 TODO 티켓은 오버듀다', () => {
    expect(isOverdue(makeTicket({ status: 'TODO', dueDate: YESTERDAY }), TODAY)).toBe(true);
  });

  it('008-2: DONE 티켓은 종료예정일이 지나도 오버듀가 아니다', () => {
    expect(isOverdue(makeTicket({ status: 'DONE', dueDate: YESTERDAY }), TODAY)).toBe(false);
  });

  it('008-3: 종료예정일이 없으면 오버듀가 아니다', () => {
    expect(isOverdue(makeTicket({ status: 'TODO', dueDate: null }), TODAY)).toBe(false);
  });

  it('008-4: 종료예정일이 미래이면 오버듀가 아니다', () => {
    expect(isOverdue(makeTicket({ status: 'TODO', dueDate: TOMORROW }), TODAY)).toBe(false);
  });

  it('008-5: 종료예정일이 오늘이면 아직 오버듀가 아니다', () => {
    expect(isOverdue(makeTicket({ status: 'TODO', dueDate: TODAY }), TODAY)).toBe(false);
  });

  it('008-6: 종료예정일이 지난 BACKLOG 티켓은 오버듀다', () => {
    expect(isOverdue(makeTicket({ status: 'BACKLOG', dueDate: YESTERDAY }), TODAY)).toBe(true);
  });

  it('008-7: 종료예정일이 지난 IN_PROGRESS 티켓은 오버듀다', () => {
    expect(isOverdue(makeTicket({ status: 'IN_PROGRESS', dueDate: YESTERDAY }), TODAY)).toBe(true);
  });
});

describe('TC-API-002: Done 칼럼 24시간 필터 (isDoneVisible)', () => {
  const doneAt = (hoursAgo: number) =>
    makeTicket({ status: 'DONE', completedAt: new Date(NOW.getTime() - hoursAgo * HOUR_MS) });

  it('002-5: 23시간 전에 완료한 티켓은 표시된다', () => {
    expect(isDoneVisible(doneAt(23), NOW)).toBe(true);
  });

  it('002-6: 25시간 전에 완료한 티켓은 표시되지 않는다', () => {
    expect(isDoneVisible(doneAt(25), NOW)).toBe(false);
  });

  it('002-5 경계: 정확히 24시간 전에 완료한 티켓은 표시된다', () => {
    expect(isDoneVisible(doneAt(24), NOW)).toBe(true);
  });

  it('002-6 보충: completedAt이 없는 DONE 티켓은 표시되지 않는다', () => {
    expect(isDoneVisible(makeTicket({ status: 'DONE', completedAt: null }), NOW)).toBe(false);
  });
});

describe('TC-API-002: 보드 구성 (groupBoard)', () => {
  it('002-1: 티켓이 없으면 네 칼럼이 모두 빈 배열이고 total은 0이다', () => {
    expect(groupBoard([], NOW)).toEqual({
      board: { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] },
      total: 0,
    });
  });

  it('002-2: 티켓을 상태별 칼럼으로 그룹화한다', () => {
    const { board } = groupBoard(
      [
        makeTicket({ id: 1, status: 'BACKLOG' }),
        makeTicket({ id: 2, status: 'TODO' }),
        makeTicket({ id: 3, status: 'IN_PROGRESS' }),
        makeTicket({ id: 4, status: 'DONE', completedAt: NOW }),
      ],
      NOW,
    );

    expect(board.BACKLOG.map((t) => t.id)).toEqual([1]);
    expect(board.TODO.map((t) => t.id)).toEqual([2]);
    expect(board.IN_PROGRESS.map((t) => t.id)).toEqual([3]);
    expect(board.DONE.map((t) => t.id)).toEqual([4]);
  });

  it('002-3: 칼럼 안에서 position 오름차순으로 정렬한다', () => {
    const { board } = groupBoard(
      [
        makeTicket({ id: 1, position: 1024 }),
        makeTicket({ id: 2, position: -1024 }),
        makeTicket({ id: 3, position: 0 }),
      ],
      NOW,
    );

    expect(board.BACKLOG.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('002-4: total은 숨겨진 Done 티켓을 제외한 표시 티켓 수다', () => {
    const { board, total } = groupBoard(
      [
        makeTicket({ id: 1, status: 'BACKLOG' }),
        makeTicket({ id: 2, status: 'DONE', completedAt: new Date(NOW.getTime() - 23 * HOUR_MS) }),
        makeTicket({ id: 3, status: 'DONE', completedAt: new Date(NOW.getTime() - 25 * HOUR_MS) }),
      ],
      NOW,
    );

    expect(board.DONE.map((t) => t.id)).toEqual([2]);
    expect(total).toBe(2);
  });

  it('002-7: 각 티켓에 isOverdue를 계산해 포함한다 (Asia/Seoul 기준 오늘)', () => {
    const { board } = groupBoard(
      [
        makeTicket({ id: 1, status: 'TODO', dueDate: YESTERDAY }),
        makeTicket({ id: 2, status: 'TODO', dueDate: TODAY, position: 1 }),
      ],
      NOW,
    );

    expect(board.TODO.map((t) => t.isOverdue)).toEqual([true, false]);
  });
});
