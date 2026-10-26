import { z } from 'zod';

export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('-createdAt'),
  search: z.string().optional(),
  genre: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['available', 'reserved', 'borrowed', 'out_of_stock']).optional(),
});

export const createBookSchema = z.object({
  isbn: z.string().min(10).max(20),
  title: z.string().min(1).max(300),
  author: z.string().min(1).max(200),
  genreId: z.string().min(1),
  categoryId: z.string().min(1),
  publisher: z.string().min(1).max(200),
  edition: z.string().max(50).optional(),
  publishedYear: z.coerce.number().int().min(1000).max(new Date().getFullYear() + 1),
  language: z.string().min(1).max(50).default('English'),
  description: z.string().max(5000).optional(),
  shelfLocation: z.string().min(1).max(50),
  totalCopies: z.coerce.number().int().min(1).max(1000).default(1),
});

export const updateBookSchema = createBookSchema.partial();

export const adjustCopiesSchema = z.object({
  totalCopies: z.coerce.number().int().min(0).max(1000),
});

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type AdjustCopiesInput = z.infer<typeof adjustCopiesSchema>;
