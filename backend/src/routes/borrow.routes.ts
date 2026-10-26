import { Router } from 'express';
import { borrowController } from '../controllers/borrow.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import { issueBookSchema, listQuerySchema, returnBookSchema } from '../validators/borrow.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/transactions',
  requirePermission(PERMISSIONS.BORROW_READ),
  validate(listQuerySchema, 'query'),
  borrowController.listTransactions
);

router.get(
  '/transactions/:id',
  requirePermission(PERMISSIONS.BORROW_READ),
  borrowController.getTransaction
);

router.get(
  '/overdue',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BORROW_READ),
  validate(listQuerySchema, 'query'),
  borrowController.listOverdue
);

router.post(
  '/issue',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BORROW_ISSUE),
  validate(issueBookSchema),
  borrowController.issue
);

router.post(
  '/return',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.BORROW_RETURN),
  validate(returnBookSchema),
  borrowController.returnBook
);

export default router;
