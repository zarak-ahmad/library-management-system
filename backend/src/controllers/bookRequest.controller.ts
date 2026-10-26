import { Request, Response, NextFunction } from 'express';
import { bookRequestService } from '../services/bookRequest.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const bookRequestController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookRequestService.list(req.query as never, req as never);
      ApiResponseUtil.success(res, result.requests, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await bookRequestService.create(req.body, req as never);
      ApiResponseUtil.created(res, request, 'Book request submitted');
    } catch (error) {
      next(error);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookRequestService.approve(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, result, 'Book request approved and issued');
    } catch (error) {
      next(error);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await bookRequestService.reject(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, request, 'Book request rejected');
    } catch (error) {
      next(error);
    }
  },

  cancel: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await bookRequestService.cancel(req.params.id as string, req as never);
      ApiResponseUtil.success(res, request, 'Book request cancelled');
    } catch (error) {
      next(error);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookRequestService.remove(req.params.id as string, req as never);
      ApiResponseUtil.success(res, result, 'Book request deleted');
    } catch (error) {
      next(error);
    }
  },
};
