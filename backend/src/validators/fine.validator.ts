import { z } from 'zod';

export const listFinesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('-createdAt'),
  paymentStatus: z.enum(['pending', 'paid', 'waived']).optional(),
  studentId: z.string().optional(),
});

export const editFineSchema = z.object({
  amount: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
});

export const waiveFineSchema = z.object({
  reason: z.string().min(3, 'Reason is required').max(500),
});

export const payFineSchema = z.object({
  paymentMethod: z.enum(['cash', 'online']).default('cash'),
  receiptNumber: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  discount: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid payment date'),
  paymentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid payment time'),
});

export type ListFinesQuery = z.infer<typeof listFinesQuerySchema>;
export type EditFineInput = z.infer<typeof editFineSchema>;
export type WaiveFineInput = z.infer<typeof waiveFineSchema>;
export type PayFineInput = z.infer<typeof payFineSchema>;
