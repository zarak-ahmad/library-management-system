import { Router } from 'express';
import { genreController } from '../controllers/genre.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import { createGenreSchema, updateGenreSchema } from '../validators/genre.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.BOOKS_READ),
  genreController.list
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.BOOKS_READ),
  genreController.getById
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.GENRES_MANAGE),
  validate(createGenreSchema),
  genreController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.GENRES_MANAGE),
  validate(updateGenreSchema),
  genreController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.GENRES_MANAGE),
  genreController.deactivate
);

export default router;
