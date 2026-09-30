import { getNextTopPosition } from '@/server/services/ticketService';

describe('TC-API-001-19: 새 티켓 position 계산 (Backlog 맨 위 배치)', () => {
  it('Backlog가 비어 있으면(최솟값 없음) 0을 반환한다', () => {
    expect(getNextTopPosition(null)).toBe(0);
  });

  it('최솟값이 0이면 -1024를 반환한다', () => {
    expect(getNextTopPosition(0)).toBe(-1024);
  });

  it('최솟값이 -1024이면 -2048을 반환한다', () => {
    expect(getNextTopPosition(-1024)).toBe(-2048);
  });
});
