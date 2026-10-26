import { z } from 'zod';

export const reportTypes = [
  'inventory',
  'borrowing',
  'fines',
  'student-activity',
  'reservations',
  'overdue',
  'librarian-activity',
] as const;

export type ReportType = (typeof reportTypes)[number];

export const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const parseDateRange = (query: ReportQuery): { start?: Date; end?: Date } => {
  const start = query.startDate ? new Date(query.startDate) : undefined;
  const end = query.endDate ? new Date(query.endDate) : undefined;
  if (end) {
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
};
