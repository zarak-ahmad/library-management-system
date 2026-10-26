import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { PERMISSIONS } from '../types';
import {
  createLibrarianSchema,
  createStudentSchema,
  listUsersQuerySchema,
  updateLibrarianSchema,
  updateProfileSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
} from '../validators/user.validator';

const router = Router();

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

router.get(
  '/students',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.STUDENTS_READ),
  validate(listUsersQuerySchema, 'query'),
  userController.listStudents
);

router.get(
  '/students/:id',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.STUDENTS_READ),
  userController.getStudent
);

router.post(
  '/students',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.STUDENTS_CREATE),
  validate(createStudentSchema),
  userController.createStudent
);

router.put(
  '/students/:id',
  authorize('admin', 'librarian'),
  requirePermission(PERMISSIONS.STUDENTS_UPDATE),
  validate(updateStudentSchema),
  userController.updateStudent
);

router.patch(
  '/students/:id/status',
  authorize('admin'),
  requirePermission(PERMISSIONS.STUDENTS_MANAGE_STATUS),
  validate(updateStudentStatusSchema),
  userController.updateStudentStatus
);

router.get(
  '/librarians',
  authorize('admin'),
  requirePermission(PERMISSIONS.LIBRARIANS_READ),
  validate(listUsersQuerySchema, 'query'),
  userController.listLibrarians
);

router.get(
  '/librarians/:id',
  authorize('admin'),
  requirePermission(PERMISSIONS.LIBRARIANS_READ),
  userController.getLibrarian
);

router.post(
  '/librarians',
  authorize('admin'),
  requirePermission(PERMISSIONS.LIBRARIANS_CREATE),
  validate(createLibrarianSchema),
  userController.createLibrarian
);

router.put(
  '/librarians/:id',
  authorize('admin'),
  requirePermission(PERMISSIONS.LIBRARIANS_UPDATE),
  validate(updateLibrarianSchema),
  userController.updateLibrarian
);

router.delete(
  '/librarians/:id',
  authorize('admin'),
  requirePermission(PERMISSIONS.LIBRARIANS_DELETE),
  userController.deactivateLibrarian
);

export default router;
