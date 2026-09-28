import { z } from 'zod';

// API_SPEC.md: Timezone Asia/Seoul 기준 YYYY-MM-DD
const todayInSeoul = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

export const createTicketSchema = z.object({
  title: z
    .string({ required_error: '제목을 입력해주세요' })
    .max(200, '제목은 200자 이내로 입력해주세요'),
  description: z.string().optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH'], {
      errorMap: () => ({ message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요' }),
    })
    .default('MEDIUM'),
  plannedStartDate: z.string().optional(),
  dueDate: z
    .string()
    .refine((date) => date >= todayInSeoul(), '종료예정일은 오늘 이후 날짜를 선택해주세요')
    .optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
