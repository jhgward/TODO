import { calculateInsertPosition, getTimestampChanges } from '@/server/services/ticketRules';

const NOW = new Date('2026-09-30T03:00:00.000Z');

describe('TC-API-007: 인덱스 → position 계산 (calculateInsertPosition)', () => {
  const column = [
    { id: 1, position: 0 },
    { id: 2, position: 1024 },
    { id: 3, position: 2048 },
  ];

  it('007-13: 빈 칼럼이면 position 0, affected는 비어 있다', () => {
    expect(calculateInsertPosition([], 0)).toEqual({ position: 0, affected: [] });
  });

  it('007-1 규칙: 맨 앞(index 0)이면 첫 번째 카드의 position − 1024', () => {
    expect(calculateInsertPosition(column, 0)).toEqual({ position: -1024, affected: [] });
  });

  it('007-14: index가 칼럼 길이와 같거나 크면 마지막 카드의 position + 1024', () => {
    expect(calculateInsertPosition(column, 3)).toEqual({ position: 3072, affected: [] });
    expect(calculateInsertPosition(column, 999999)).toEqual({ position: 3072, affected: [] });
  });

  it('007-2 규칙: 두 카드 사이면 중간값', () => {
    expect(calculateInsertPosition(column, 1)).toEqual({ position: 512, affected: [] });
  });

  it('007-2 규칙: 중간값이 정수가 아니면 내림한다', () => {
    const odd = [
      { id: 1, position: 0 },
      { id: 2, position: 5 },
    ];

    expect(calculateInsertPosition(odd, 1)).toEqual({ position: 2, affected: [] });
  });

  it('007-2 규칙: 음수 position 사이에서도 앞 카드보다 크고 뒤 카드보다 작다', () => {
    const negative = [
      { id: 1, position: -5 },
      { id: 2, position: -2 },
    ];

    const { position, affected } = calculateInsertPosition(negative, 1);

    expect(position).toBeGreaterThan(-5);
    expect(position).toBeLessThan(-2);
    expect(affected).toEqual([]);
  });

  it('007-8: 사이에 넣을 정수가 없으면(간격 1) 칼럼 전체를 0부터 1024 간격으로 재정렬한다', () => {
    const tight = [
      { id: 1, position: 5 },
      { id: 2, position: 6 },
      { id: 3, position: 1024 },
    ];

    expect(calculateInsertPosition(tight, 1)).toEqual({
      position: 1024,
      affected: [
        { id: 1, position: 0 },
        { id: 2, position: 2048 },
        { id: 3, position: 3072 },
      ],
    });
  });

  it('007-8: 재정렬해도 position이 그대로인 티켓은 affected에 넣지 않는다', () => {
    const tight = [
      { id: 1, position: 0 },
      { id: 2, position: 1 },
    ];

    expect(calculateInsertPosition(tight, 1)).toEqual({
      position: 1024,
      affected: [{ id: 2, position: 2048 }],
    });
  });

  it('007-8: 같은 position이 겹쳐 있어도(간격 0) 재정렬한다', () => {
    const duplicated = [
      { id: 1, position: 0 },
      { id: 2, position: 0 },
    ];

    expect(calculateInsertPosition(duplicated, 1)).toEqual({
      position: 1024,
      affected: [{ id: 2, position: 2048 }],
    });
  });
});

describe('TC-API-007: 이동 시 시작일·종료일 변경 (getTimestampChanges)', () => {
  it('007-3: BACKLOG → TODO이면 startedAt을 현재 시각으로 설정한다', () => {
    expect(getTimestampChanges('BACKLOG', 'TODO', NOW)).toEqual({ startedAt: NOW });
  });

  it('007-4: TODO → BACKLOG이면 startedAt을 비운다', () => {
    expect(getTimestampChanges('TODO', 'BACKLOG', NOW)).toEqual({ startedAt: null });
  });

  it('007-5: DONE → TODO이면 completedAt을 비우고 startedAt을 설정한다', () => {
    expect(getTimestampChanges('DONE', 'TODO', NOW)).toEqual({
      startedAt: NOW,
      completedAt: null,
    });
  });

  it('007-6: DONE → BACKLOG이면 completedAt과 startedAt을 모두 비운다', () => {
    expect(getTimestampChanges('DONE', 'BACKLOG', NOW)).toEqual({
      startedAt: null,
      completedAt: null,
    });
  });

  it('007-7: TODO → IN_PROGRESS이면 아무것도 바꾸지 않는다', () => {
    expect(getTimestampChanges('TODO', 'IN_PROGRESS', NOW)).toEqual({});
  });

  it('007-15: IN_PROGRESS → BACKLOG이면 startedAt을 비운다', () => {
    expect(getTimestampChanges('IN_PROGRESS', 'BACKLOG', NOW)).toEqual({ startedAt: null });
  });

  it('007-16: 같은 칼럼 안에서 옮기면 아무것도 바꾸지 않는다', () => {
    expect(getTimestampChanges('TODO', 'TODO', NOW)).toEqual({});
    expect(getTimestampChanges('BACKLOG', 'BACKLOG', NOW)).toEqual({});
  });

  it('007-3 보충: IN_PROGRESS → TODO이면 startedAt을 현재 시각으로 다시 설정한다', () => {
    expect(getTimestampChanges('IN_PROGRESS', 'TODO', NOW)).toEqual({ startedAt: NOW });
  });

  it('007-5 보충: DONE → IN_PROGRESS이면 completedAt만 비운다', () => {
    expect(getTimestampChanges('DONE', 'IN_PROGRESS', NOW)).toEqual({ completedAt: null });
  });
});
