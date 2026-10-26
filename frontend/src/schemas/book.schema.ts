import { z } from 'zod';

export const bookFormSchema = z.object({
  isbn: z.string().min(10, 'ISBN must be at least 10 characters'),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  genreId: z.string().min(1, 'Genre is required'),
  categoryId: z.string().min(1, 'Category is required'),
  publisher: z.string().min(1, 'Publisher is required'),
  edition: z.string().optional(),
  publishedYear: z.coerce.number().int().min(1000).max(new Date().getFullYear() + 1),
  language: z.string().min(1).default('English'),
  description: z.string().optional(),
  shelfLocation: z.string().min(1, 'Shelf location is required'),
  totalCopies: z.coerce.number().int().min(1).default(1),
});

export const genreFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
});

export const categoryFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
});

export type BookFormValues = z.infer<typeof bookFormSchema>;
export type GenreFormValues = z.infer<typeof genreFormSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
