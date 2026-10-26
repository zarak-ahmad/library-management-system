import { Request, Response, NextFunction } from 'express';
import { fineService } from '../services/fine.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const fineController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fineService.list(req.query as never, req as never);
      ApiResponseUtil.success(res, result.fines, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fine = await fineService.getById(req.params.id as string, req as never);
      ApiResponseUtil.success(res, fine);
    } catch (error) {
      next(error);
    }
  },

  getSummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await fineService.getSummary(req as never, req.query.studentId as string | undefined);
      ApiResponseUtil.success(res, summary);
    } catch (error) {
      next(error);
    }
  },

  getFinanceDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const details = await fineService.getFinanceDetails(
        req as never,
        req.query.studentId as string | undefined
      );
      ApiResponseUtil.success(res, details);
    } catch (error) {
      next(error);
    }
  },

  edit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fine = await fineService.edit(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, fine, 'Fine updated successfully');
    } catch (error) {
      next(error);
    }
  },

  waive: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fine = await fineService.waive(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, fine, 'Fine waived successfully');
    } catch (error) {
      next(error);
    }
  },

  pay: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fineService.pay(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, result, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  },

  listPayments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await fineService.listPayments(req.params.id as string, req as never);
      ApiResponseUtil.success(res, payments);
    } catch (error) {
      next(error);
    }
  },
};
