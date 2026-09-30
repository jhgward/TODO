import { z } from 'zod';
import { TICKET_PRIORITY, TICKET_STATUS } from '@/shared/types';
import {
  isValidDateString,
  MAX_TICKET_ID,
  REQUEST_FORMAT_ERROR_MESSAGE,
} from '@/shared/validations/common';

// REQUIREMENTS.md FR-001, FR-004, FR-007 검증 에러 메시지
export const TICKET_ERROR_MESSAGES = {
  TITLE_REQUIRED: '제목을 입력해주세요',
  TITLE_TOO_LONG: '제목은 200자 이내로 입력해주세요',
  DESCRIPTION_TOO_LONG: '설명은 1000자 이내로 입력해주세요',
  INVALID_PRIORITY: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요',
  DUE_DATE_NOT_FUTURE: '종료예정일은 오늘 이후 날짜를 선택해주세요',
  INVALID_REORDER_STATUS: '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요',
  INVALID_FORMAT: REQUEST_FORMAT_ERROR_MESSAGE,
} as const;

// API_SPEC.md: Timezone Asia/Seoul 기준 YYYY-MM-DD
const todayInSeoul = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

// --- 필드 규칙 (생성·수정 공통) ---

const titleField = z
  .string({
    required_error: TICKET_ERROR_MESSAGES.TITLE_REQUIRED,
    invalid_type_error: TICKET_ERROR_MESSAGES.INVALID_FORMAT,
  })
  .trim()
  .min(1, TICKET_ERROR_MESSAGES.TITLE_REQUIRED)
  .max(200, TICKET_ERROR_MESSAGES.TITLE_TOO_LONG);

const descriptionField = z
  .string({ invalid_type_error: TICKET_ERROR_MESSAGES.INVALID_FORMAT })
  .max(1000, TICKET_ERROR_MESSAGES.DESCRIPTION_TOO_LONG);

const priorityField = z.nativeEnum(TICKET_PRIORITY, {
  errorMap: () => ({ message: TICKET_ERROR_MESSAGES.INVALID_PRIORITY }),
});

const dateField = z
  .string({ invalid_type_error: TICKET_ERROR_MESSAGES.INVALID_FORMAT })
  .refine(isValidDateString, TICKET_ERROR_MESSAGES.INVALID_FORMAT);

// 종료예정일: Asia/Seoul 기준 내일 이후
const dueDateField = dateField.refine(
  (date) => date > todayInSeoul(),
  TICKET_ERROR_MESSAGES.DUE_DATE_NOT_FUTURE,
);

const objectOptions = { invalid_type_error: TICKET_ERROR_MESSAGES.INVALID_FORMAT };

// POST /api/tickets
export const createTicketSchema = z.object(
  {
    title: titleField,
    description: descriptionField.optional(),
    priority: priorityField.default(TICKET_PRIORITY.MEDIUM),
    plannedStartDate: dateField.optional(),
    dueDate: dueDateField.optional(),
  },
  objectOptions,
);

// PATCH /api/tickets/:id — 모든 필드 선택, 설명·날짜는 null로 삭제 가능.
// status, position 등 그 외 키는 제거된다 (수정 불가).
export const updateTicketSchema = z.object(
  {
    title: titleField.optional(),
    description: descriptionField.nullable().optional(),
    priority: priorityField.optional(),
    plannedStartDate: dateField.nullable().optional(),
    dueDate: dueDateField.nullable().optional(),
  },
  objectOptions,
);

const numberOptions = {
  required_error: TICKET_ERROR_MESSAGES.INVALID_FORMAT,
  invalid_type_error: TICKET_ERROR_MESSAGES.INVALID_FORMAT,
};

// PATCH /api/tickets/reorder — DONE은 허용하지 않는다 (완료는 /:id/complete).
// position은 대상 칼럼 내 인덱스(0부터)다.
export const reorderTicketSchema = z.object(
  {
    ticketId: z
      .number(numberOptions)
      .int(TICKET_ERROR_MESSAGES.INVALID_FORMAT)
      .positive(TICKET_ERROR_MESSAGES.INVALID_FORMAT)
      .max(MAX_TICKET_ID, TICKET_ERROR_MESSAGES.INVALID_FORMAT),
    status: z.enum([TICKET_STATUS.BACKLOG, TICKET_STATUS.TODO, TICKET_STATUS.IN_PROGRESS], {
      errorMap: () => ({ message: TICKET_ERROR_MESSAGES.INVALID_REORDER_STATUS }),
    }),
    position: z
      .number(numberOptions)
      .int(TICKET_ERROR_MESSAGES.INVALID_FORMAT)
      .min(0, TICKET_ERROR_MESSAGES.INVALID_FORMAT),
  },
  objectOptions,
);
