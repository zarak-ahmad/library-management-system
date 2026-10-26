import { Router, Request, Response, NextFunction } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import { reportQuerySchema } from '../validators/report.validator';
import { AuthRequest } from '../types/express.d';
import { ApiError } from '../utils/ApiError';

const router = Router();

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.REPORTS_GENERATE));

const requireAdminForLibrarianReport = (req: Request, _res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (req.params.type === 'librarian-activity' && authReq.user.role !== 'admin') {
    return next(ApiError.forbidden('Admin access required for this report'));
  }
  next();
};

router.get(
  '/:type/export/:format',
  authorize('admin', 'librarian'),
  requireAdminForLibrarianReport,
  validate(reportQuerySchema, 'query'),
  reportController.exportReport
);

router.get(
  '/:type',
  authorize('admin', 'librarian'),
  requireAdminForLibrarianReport,
  validate(reportQuerySchema, 'query'),
  reportController.generate
);

export default router;
