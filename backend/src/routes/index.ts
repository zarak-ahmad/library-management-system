import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import bookRoutes from './book.routes';
import genreRoutes from './genre.routes';
import categoryRoutes from './category.routes';
import bookRequestRoutes from './bookRequest.routes';
import borrowRoutes from './borrow.routes';
import reservationRoutes from './reservation.routes';
import notificationRoutes from './notification.routes';
import fineRoutes from './fine.routes';
import settingsRoutes from './settings.routes';
import supportRoutes from './support.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import webhookRoutes from './webhook.routes';
import requestConfirmationRoutes from './requestConfirmation.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/books', bookRoutes);
router.use('/genres', genreRoutes);
router.use('/categories', categoryRoutes);
router.use('/book-requests', bookRequestRoutes);
router.use('/borrow', borrowRoutes);
router.use('/reservations', reservationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/fines', fineRoutes);
router.use('/settings', settingsRoutes);
router.use('/support', supportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/request-confirmations', requestConfirmationRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'LMS API is running', timestamp: new Date().toISOString() });
});

export default router;
