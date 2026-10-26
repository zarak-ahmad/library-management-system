import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission, requireBorrowingAllowed } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import { createReservationSchema, listQuerySchema } from '../validators/borrow.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.RESERVATIONS_READ),
  validate(listQuerySchema, 'query'),
  reservationController.list
);

router.post(
  '/',
  authorize('student'),
  requirePermission(PERMISSIONS.RESERVATIONS_CREATE),
  requireBorrowingAllowed,
  validate(createReservationSchema),
  reservationController.create
);

router.patch(
  '/:id/cancel',
  authorize('student', 'admin', 'librarian'),
  requirePermission(PERMISSIONS.RESERVATIONS_READ),
  reservationController.cancel
);

router.patch(
  '/:id/complete',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.RESERVATIONS_MANAGE),
  reservationController.complete
);

export default router;
