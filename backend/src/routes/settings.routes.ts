import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import {
  updateFineRulesSchema,
  updateBlockRulesSchema,
  updateBorrowRulesSchema,
} from '../validators/settings.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  settingsController.get
);

router.put(
  '/fine-rules',
  authorize('admin'),
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate(updateFineRulesSchema),
  settingsController.updateFineRules
);

router.put(
  '/block-rules',
  authorize('admin'),
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate(updateBlockRulesSchema),
  settingsController.updateBlockRules
);

router.put(
  '/borrow-rules',
  authorize('admin'),
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  validate(updateBorrowRulesSchema),
  settingsController.updateBorrowRules
);

export default router;
