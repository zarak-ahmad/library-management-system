import { z } from 'zod';

const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]{10,15}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''));

export const createStudentSchema = z.object({
  registrationNumber: z.string().min(3).max(30),
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: phoneSchema,
  department: z.string().min(2).max(100),
  address: z.string().min(5).max(500),
});

export const updateStudentSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: phoneSchema,
  department: z.string().min(2).max(100).optional(),
  address: z.string().min(5).max(500).optional(),
});

export const updateStudentStatusSchema = z.object({
  status: z.enum(['active', 'blocked', 'suspended', 'pending_verification']),
  reason: z.string().min(3, 'Reason is required').max(500),
});

export const createLibrarianSchema = z.object({
  employeeId: z.string().min(2).max(30),
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: phoneSchema,
  department: z.string().min(2).max(100),
});

export const updateLibrarianSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: phoneSchema,
  department: z.string().min(2).max(100).optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: phoneSchema,
  address: z.string().min(5).max(500).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('-createdAt'),
  search: z.string().optional(),
  status: z.enum(['active', 'blocked', 'suspended', 'pending_verification']).optional(),
  department: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type UpdateStudentStatusInput = z.infer<typeof updateStudentStatusSchema>;
export type CreateLibrarianInput = z.infer<typeof createLibrarianSchema>;
export type UpdateLibrarianInput = z.infer<typeof updateLibrarianSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
