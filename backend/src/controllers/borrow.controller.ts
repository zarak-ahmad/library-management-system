import { Request, Response, NextFunction } from 'express';
import { borrowService } from '../services/borrow.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const borrowController = {
  issue: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await borrowService.issue(req.body, req as never);
      ApiResponseUtil.created(res, transaction, 'Book issued successfully');
    } catch (error) {
      next(error);
    }
  },

  returnBook: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await borrowService.returnBook(req.body, req as never);
      ApiResponseUtil.success(res, result, 'Book returned successfully');
    } catch (error) {
      next(error);
    }
  },

  listTransactions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await borrowService.listTransactions(req.query as never, req as never);
      ApiResponseUtil.success(res, result.transactions, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  getTransaction: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await borrowService.getTransaction(req.params.id as string, req as never);
      ApiResponseUtil.success(res, transaction);
    } catch (error) {
      next(error);
    }
  },

  listOverdue: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await borrowService.listOverdue(req.query as never);
      ApiResponseUtil.success(res, result.transactions, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },
};
