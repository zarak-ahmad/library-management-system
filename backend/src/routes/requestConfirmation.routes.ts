import { Router } from 'express';
import { requestConfirmationController } from '../controllers/requestConfirmation.controller';

const router = Router();

router.get('/:token', requestConfirmationController.getByToken);
router.post('/:token/respond', requestConfirmationController.respond);

export default router;
