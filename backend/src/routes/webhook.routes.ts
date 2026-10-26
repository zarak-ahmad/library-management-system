import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

router.get('/whatsapp/meta', webhookController.verifyMeta);
router.post('/whatsapp/meta', webhookController.handleMeta);
router.post('/whatsapp/twilio', webhookController.handleTwilio);
router.post('/whatsapp/wasender', webhookController.handleWasender);
router.get('/whatsapp/confirm-order/:token', webhookController.confirmOrder);
router.get('/whatsapp/cancel-order/:token', webhookController.cancelOrder);
router.post('/whatsapp/dev-respond', webhookController.devRespond);

export default router;
