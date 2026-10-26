import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const settingsController = {
  get: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.get();
      ApiResponseUtil.success(res, settings);
    } catch (error) {
      next(error);
    }
  },

  updateFineRules: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.updateFineRules(req.body, req as never);
      ApiResponseUtil.success(res, settings, 'Fine rules updated successfully');
    } catch (error) {
      next(error);
    }
  },

  updateBlockRules: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.updateBlockRules(req.body, req as never);
      ApiResponseUtil.success(res, settings, 'Block rules updated successfully');
    } catch (error) {
      next(error);
    }
  },

  updateBorrowRules: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.updateBorrowRules(req.body, req as never);
      ApiResponseUtil.success(res, settings, 'Borrow rules updated successfully');
    } catch (error) {
      next(error);
    }
  },
};
