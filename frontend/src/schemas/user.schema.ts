import { z } from 'zod';

export const createStudentSchema = z.object({
  registrationNumber: z.string().min(3, 'Registration number is required'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  department: z.string().min(2, 'Department is required'),
  address: z.string().min(5, 'Address is required'),
});

export const updateStudentSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
});

export const createLibrarianSchema = z.object({
  employeeId: z.string().min(2, 'Employee ID is required'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  department: z.string().min(2, 'Department is required'),
});

export const updateLibrarianSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().min(2).optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const statusChangeSchema = z.object({
  status: z.enum(['active', 'blocked', 'suspended', 'pending_verification']),
  reason: z.string().min(3, 'Reason is required'),
});

export type CreateStudentForm = z.infer<typeof createStudentSchema>;
export type UpdateStudentForm = z.infer<typeof updateStudentSchema>;
export type CreateLibrarianForm = z.infer<typeof createLibrarianSchema>;
export type UpdateLibrarianForm = z.infer<typeof updateLibrarianSchema>;
export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
export type StatusChangeForm = z.infer<typeof statusChangeSchema>;
