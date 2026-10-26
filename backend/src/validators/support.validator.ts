import { z } from 'zod';

export const supportCategories = [
  'account_blocked',
  'fine_appeal',
  'reactivation_request',
  'incorrect_fine',
  'borrowing_restriction_appeal',
  'lost_book',
  'profile_correction',
  'general_inquiry',
] as const;

export const supportPriorities = ['low', 'medium', 'high', 'urgent'] as const;

export const supportStatuses = [
  'open',
  'under_review',
  'waiting_for_student',
  'resolved',
  'rejected',
] as const;

export const listSupportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('-submittedDate'),
  status: z.enum(supportStatuses).optional(),
  category: z.enum(supportCategories).optional(),
  priority: z.enum(supportPriorities).optional(),
  studentId: z.string().optional(),
  assignedTo: z.string().optional(),
});

export const createSupportSchema = z.object({
  subject: z.string().min(3, 'Subject is required').max(200),
  category: z.enum(supportCategories),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  priority: z.enum(supportPriorities).default('medium'),
});

export const assignSupportSchema = z.object({
  assignedTo: z.string().min(1, 'Assignee is required'),
});

export const updateSupportStatusSchema = z.object({
  status: z.enum(supportStatuses),
  notes: z.string().max(2000).optional(),
});

export const addCommentSchema = z.object({
  notes: z.string().min(1, 'Comment is required').max(2000),
});

export const resolveSupportSchema = z.object({
  resolutionNotes: z.string().min(3, 'Resolution notes are required').max(2000),
  status: z.enum(['resolved', 'rejected']).default('resolved'),
});

export const reopenSupportSchema = z.object({
  notes: z.string().min(3, 'Reason is required').max(2000),
});

export type ListSupportQuery = z.infer<typeof listSupportQuerySchema>;
export type CreateSupportInput = z.infer<typeof createSupportSchema>;
export type AssignSupportInput = z.infer<typeof assignSupportSchema>;
export type UpdateSupportStatusInput = z.infer<typeof updateSupportStatusSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type ResolveSupportInput = z.infer<typeof resolveSupportSchema>;
export type ReopenSupportInput = z.infer<typeof reopenSupportSchema>;
