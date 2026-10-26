import { Request, Response, NextFunction } from 'express';
import { supportService } from '../services/support.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const supportController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await supportService.list(req.query as never, req as never);
      ApiResponseUtil.success(res, result.tickets, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  getSummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await supportService.getSummary(req as never);
      ApiResponseUtil.success(res, summary);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await supportService.getById(req.params.id as string, req as never);
      ApiResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await supportService.create(
        req.body,
        req as never,
        req.file as Express.Multer.File | undefined
      );
      ApiResponseUtil.created(res, ticket, 'Support ticket submitted');
    } catch (error) {
      next(error);
    }
  },

  assign: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await supportService.assign(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, ticket, 'Ticket assigned successfully');
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await supportService.updateStatus(
        req.params.id as string,
        req.body,
        req as never
      );
      ApiResponseUtil.success(res, ticket, 'Ticket status updated');
    } catch (error) {
      next(error);
    }
  },

  addComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await supportService.addComment(
        req.params.id as string,
        req.body,
        req as never
      );
      ApiResponseUtil.success(res, ticket, 'Comment added');
    } catch (error) {
      next(error);
    }
  },

  resolve: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await supportService.resolve(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, ticket, 'Ticket closed');
    } catch (error) {
      next(error);
    }
  },

  reopen: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await supportService.reopen(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, ticket, 'Ticket reopened');
    } catch (error) {
      next(error);
    }
  },
};
