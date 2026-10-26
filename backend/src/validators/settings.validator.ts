import { z } from 'zod';

export const updateFineRulesSchema = z.object({
  ratePerDay: z.coerce.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  gracePeriodDays: z.coerce.number().min(0).optional(),
});

export const updateBlockRulesSchema = z.object({
  fineThreshold: z.coerce.number().min(0).optional(),
  maxOverdueReturns: z.coerce.number().min(1).optional(),
  autoBlockEnabled: z.boolean().optional(),
});

export const updateBorrowRulesSchema = z.object({
  borrowDurationDays: z.coerce.number().min(1).optional(),
  maxBooksPerStudent: z.coerce.number().min(1).optional(),
  reservationExpiryDays: z.coerce.number().min(1).optional(),
});

export type UpdateFineRulesInput = z.infer<typeof updateFineRulesSchema>;
export type UpdateBlockRulesInput = z.infer<typeof updateBlockRulesSchema>;
export type UpdateBorrowRulesInput = z.infer<typeof updateBorrowRulesSchema>;
