import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthRequest } from '../types/express.d';

export const notificationController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const page = parseInt(String(req.query.page || 1), 10);
      const limit = parseInt(String(req.query.limit || 20), 10);
      const result = await notificationService.list(authReq.user.id, page, limit);
      ApiResponseUtil.success(res, result.notifications, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  unreadCount: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const count = await notificationService.getUnreadCount(authReq.user.id);
      ApiResponseUtil.success(res, { count });
    } catch (error) {
      next(error);
    }
  },

  markRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      await notificationService.markRead(authReq.user.id, req.params.id as string);
      ApiResponseUtil.success(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  },

  markAllRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      await notificationService.markAllRead(authReq.user.id);
      ApiResponseUtil.success(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  },
};
