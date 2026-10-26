import { Router } from 'express';
import { supportController } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadSupportAttachment } from '../middleware/upload.middleware';
import { PERMISSIONS } from '../types';
import {
  listSupportQuerySchema,
  createSupportSchema,
  assignSupportSchema,
  updateSupportStatusSchema,
  addCommentSchema,
  resolveSupportSchema,
  reopenSupportSchema,
} from '../validators/support.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/summary',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  supportController.getSummary
);

router.get(
  '/',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  validate(listSupportQuerySchema, 'query'),
  supportController.list
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  supportController.getById
);

router.post(
  '/',
  authorize('student'),
  requirePermission(PERMISSIONS.SUPPORT_CREATE),
  uploadSupportAttachment.single('attachment'),
  validate(createSupportSchema),
  supportController.create
);

router.patch(
  '/:id/assign',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.SUPPORT_MANAGE),
  validate(assignSupportSchema),
  supportController.assign
);

router.patch(
  '/:id/status',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.SUPPORT_MANAGE),
  validate(updateSupportStatusSchema),
  supportController.updateStatus
);

router.post(
  '/:id/comments',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  validate(addCommentSchema),
  supportController.addComment
);

router.patch(
  '/:id/resolve',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.SUPPORT_MANAGE),
  validate(resolveSupportSchema),
  supportController.resolve
);

router.patch(
  '/:id/reopen',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.SUPPORT_MANAGE),
  validate(reopenSupportSchema),
  supportController.reopen
);

export default router;
