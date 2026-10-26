import { Genre } from '../models/Genre.model';
import { ApiError } from '../utils/ApiError';
import { createAuditLog } from './audit.service';
import { AuthRequest } from '../types/express.d';
import { CreateGenreInput, UpdateGenreInput } from '../validators/genre.validator';

const sanitizeGenre = (genre: InstanceType<typeof Genre>) => ({
  id: genre._id.toString(),
  name: genre.name,
  description: genre.description,
  isActive: genre.isActive,
  createdAt: genre.createdAt,
  updatedAt: genre.updatedAt,
});

export const genreService = {
  async list(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    const genres = await Genre.find(filter).sort({ name: 1 });
    return genres.map(sanitizeGenre);
  },

  async getById(id: string) {
    const genre = await Genre.findById(id);
    if (!genre) throw ApiError.notFound('Genre not found');
    return sanitizeGenre(genre);
  },

  async create(input: CreateGenreInput, req: AuthRequest) {
    const existing = await Genre.findOne({ name: new RegExp(`^${input.name}$`, 'i') });
    if (existing) throw ApiError.conflict('Genre already exists');

    const genre = await Genre.create({
      ...input,
      createdBy: req.user.id,
    });

    await createAuditLog(req, 'genre.create', 'Genre', genre._id.toString());
    return sanitizeGenre(genre);
  },

  async update(id: string, input: UpdateGenreInput, req: AuthRequest) {
    const genre = await Genre.findById(id);
    if (!genre) throw ApiError.notFound('Genre not found');

    if (input.name && input.name.toLowerCase() !== genre.name.toLowerCase()) {
      const existing = await Genre.findOne({ name: new RegExp(`^${input.name}$`, 'i') });
      if (existing) throw ApiError.conflict('Genre name already exists');
      genre.name = input.name;
    }

    if (input.description !== undefined) genre.description = input.description;
    if (input.isActive !== undefined) genre.isActive = input.isActive;

    await genre.save();
    await createAuditLog(req, 'genre.update', 'Genre', genre._id.toString());
    return sanitizeGenre(genre);
  },

  async deactivate(id: string, req: AuthRequest) {
    const genre = await Genre.findById(id);
    if (!genre) throw ApiError.notFound('Genre not found');

    genre.isActive = false;
    await genre.save();

    await createAuditLog(req, 'genre.deactivate', 'Genre', genre._id.toString());
    return { message: 'Genre deactivated successfully' };
  },
};
