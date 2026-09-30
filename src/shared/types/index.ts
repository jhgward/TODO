// DATA_MODEL.md §4

// --- 상태 및 우선순위 ---
export const TICKET_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

// --- 칼럼 순서 정의 ---
export const COLUMN_ORDER: TicketStatus[] = [
  TICKET_STATUS.BACKLOG,
  TICKET_STATUS.TODO,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.DONE,
];

export const COLUMN_LABELS: Record<TicketStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'TODO',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

// --- 티켓 타입 ---
export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  plannedStartDate: string | null; // ISO 8601 date (YYYY-MM-DD), 시작예정일
  dueDate: string | null; // ISO 8601 date (YYYY-MM-DD), 종료예정일
  startedAt: Date | null; // 시작일 (TODO 이동 시 시스템 설정)
  completedAt: Date | null; // 종료일 (Done 이동 시 시스템 설정)
  createdAt: Date;
  updatedAt: Date;
}

// 파생 필드 포함 (보드 조회 응답용)
export interface TicketWithMeta extends Ticket {
  isOverdue: boolean; // dueDate < today && status !== DONE
}

// --- API 요청 타입 ---

// POST /api/tickets
export interface CreateTicketInput {
  title: string;
  description?: string;
  priority?: TicketPriority;
  plannedStartDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
}

// PATCH /api/tickets/:id
export interface UpdateTicketInput {
  title?: string;
  description?: string | null;
  priority?: TicketPriority;
  plannedStartDate?: string | null;
  dueDate?: string | null;
}

// PATCH /api/tickets/reorder
// DONE은 허용하지 않음 — Done 이동은 PATCH /api/tickets/:id/complete 사용
export type ReorderableStatus = Exclude<TicketStatus, typeof TICKET_STATUS.DONE>;

export interface ReorderTicketInput {
  ticketId: number;
  status: ReorderableStatus; // BACKLOG | TODO | IN_PROGRESS (DONE 제외)
  position: number;
}

// --- 보드 데이터 구조 ---
export type BoardData = Record<TicketStatus, TicketWithMeta[]>;

// --- API 응답 타입 ---

// GET /api/tickets
export interface BoardResponse {
  board: BoardData;
  total: number; // 보드에 표시되는 티켓 수 (숨겨진 Done 제외)
}

// PATCH /api/tickets/reorder
export interface AffectedTicket {
  id: number;
  position: number;
}

export interface ReorderResult {
  ticket: Ticket;
  affected: AffectedTicket[]; // 재정렬로 position이 바뀐 다른 티켓. 재정렬이 없으면 []
}
