import { Router } from 'express';
import { bookRequestController } from '../controllers/bookRequest.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission, requireBorrowingAllowed } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import {
  createBookRequestSchema,
  listQuerySchema,
  processBookRequestSchema,
} from '../validators/borrow.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.REQUESTS_READ),
  validate(listQuerySchema, 'query'),
  bookRequestController.list
);

router.post(
  '/',
  authorize('student'),
  requirePermission(PERMISSIONS.REQUESTS_CREATE),
  requireBorrowingAllowed,
  validate(createBookRequestSchema),
  bookRequestController.create
);

router.patch(
  '/:id/approve',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.REQUESTS_APPROVE),
  validate(processBookRequestSchema),
  bookRequestController.approve
);

router.patch(
  '/:id/reject',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.REQUESTS_REJECT),
  validate(processBookRequestSchema),
  bookRequestController.reject
);

router.patch(
  '/:id/cancel',
  authorize('student'),
  requirePermission(PERMISSIONS.REQUESTS_CREATE),
  bookRequestController.cancel
);

router.delete(
  '/:id',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.REQUESTS_REJECT),
  bookRequestController.remove
);

export default router;
