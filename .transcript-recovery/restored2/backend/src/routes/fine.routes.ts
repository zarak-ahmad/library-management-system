import { Router } from 'express';
import { fineController } from '../controllers/fine.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import {
  listFinesQuerySchema,
  editFineSchema,
  waiveFineSchema,
  payFineSchema,
} from '../validators/fine.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/summary',
  requirePermission(PERMISSIONS.FINES_READ),
  fineController.getSummary
);

router.get(
  '/finance-details',
  requirePermission(PERMISSIONS.FINES_READ),
  fineController.getFinanceDetails
);

router.get(
  '/',
  requirePermission(PERMISSIONS.FINES_READ),
  validate(listFinesQuerySchema, 'query'),
  fineController.list
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.FINES_READ),
  fineController.getById
);

router.get(
  '/:id/payments',
  requirePermission(PERMISSIONS.FINES_READ),
  fineController.listPayments
);

router.patch(
  '/:id',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.FINES_MANAGE),
  validate(editFineSchema),
  fineController.edit
);

router.post(
  '/:id/waive',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.FINES_WAIVE),
  validate(waiveFineSchema),
  fineController.waive
);

router.post(
  '/:id/pay',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.PAYMENTS_COLLECT),
  validate(payFineSchema),
  fineController.pay
);

export default router;
