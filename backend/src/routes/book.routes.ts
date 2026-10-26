import { Router } from 'express';
import { bookController } from '../controllers/book.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadCoverImage, uploadBookImport } from '../middleware/upload.middleware';
import { PERMISSIONS } from '../types';
import {
  adjustCopiesSchema,
  createBookSchema,
  listBooksQuerySchema,
  updateBookSchema,
} from '../validators/book.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.BOOKS_READ),
  validate(listBooksQuerySchema, 'query'),
  bookController.list
);

router.get(
  '/import/template',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BOOKS_CREATE),
  bookController.importTemplate
);

router.post(
  '/import',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BOOKS_CREATE),
  uploadBookImport.single('file'),
  bookController.importBooks
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.BOOKS_READ),
  bookController.getById
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BOOKS_CREATE),
  uploadCoverImage.single('coverImage'),
  validate(createBookSchema),
  bookController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BOOKS_UPDATE),
  uploadCoverImage.single('coverImage'),
  validate(updateBookSchema),
  bookController.update
);

router.patch(
  '/:id/copies',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BOOKS_UPDATE),
  validate(adjustCopiesSchema),
  bookController.adjustCopies
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BOOKS_DELETE),
  bookController.remove
);

export default router;
