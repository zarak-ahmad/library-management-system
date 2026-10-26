import { Request, Response, NextFunction } from 'express';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { whatsappConfirmationService } from '../services/whatsappConfirmation.service';

export const requestConfirmationController = {
  getByToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await whatsappConfirmationService.getConfirmationPageData(String(req.params.token));
      ApiResponseUtil.success(res, data);
    } catch (error) {
      next(error);
    }
  },

  respond: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accepted = Boolean(req.body?.accepted);
      const result = await whatsappConfirmationService.respondFromPortal(
        String(req.params.token),
        accepted
      );
      ApiResponseUtil.success(
        res,
        result,
        accepted ? 'Request confirmed successfully' : 'Request cancelled successfully'
      );
    } catch (error) {
      next(error);
    }
  },
};
