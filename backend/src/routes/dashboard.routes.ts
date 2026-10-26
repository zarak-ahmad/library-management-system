import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/admin', authorize('admin'), dashboardController.admin);
router.get('/librarian', authorize('librarian'), dashboardController.librarian);
router.get('/student', authorize('student'), dashboardController.student);

export default router;
