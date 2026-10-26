import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthRequest } from '../types/express.d';

export const dashboardController = {
  admin: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardService.getAdminStats();
      ApiResponseUtil.success(res, stats);
    } catch (error) {
      next(error);
    }
  },

  librarian: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardService.getLibrarianStats();
      ApiResponseUtil.success(res, stats);
    } catch (error) {
      next(error);
    }
  },

  student: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardService.getStudentStats(req as AuthRequest);
      ApiResponseUtil.success(res, stats);
    } catch (error) {
      next(error);
    }
  },
};
