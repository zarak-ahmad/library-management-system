import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('-createdAt'),
  status: z.string().optional(),
  studentId: z.string().optional(),
  bookId: z.string().optional(),
});

export const createBookRequestSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

export const processBookRequestSchema = z.object({
  remarks: z.string().max(500).optional(),
});

export const issueBookSchema = z.object({
  studentId: z.string().min(1),
  bookId: z.string().min(1),
  bookRequestId: z.string().optional(),
  reservationId: z.string().optional(),
  issueDate: z.coerce.date().optional(),
});

export const returnBookSchema = z.object({
  transactionId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const createReservationSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

export type ListBookRequestsQuery = z.infer<typeof listQuerySchema>;
export type CreateBookRequestInput = z.infer<typeof createBookRequestSchema>;
export type ProcessBookRequestInput = z.infer<typeof processBookRequestSchema>;
export type IssueBookInput = z.infer<typeof issueBookSchema>;
export type ReturnBookInput = z.infer<typeof returnBookSchema>;
export type ListTransactionsQuery = z.infer<typeof listQuerySchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listQuerySchema>;
