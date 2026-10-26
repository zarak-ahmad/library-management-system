import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.BOOKS_READ),
  categoryController.list
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.BOOKS_READ),
  categoryController.getById
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(createCategorySchema),
  categoryController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(updateCategorySchema),
  categoryController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  categoryController.deactivate
);

export default router;
