import { z } from 'zod';

export const createGenreSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const updateGenreSchema = createGenreSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateGenreInput = z.infer<typeof createGenreSchema>;
export type UpdateGenreInput = z.infer<typeof updateGenreSchema>;
