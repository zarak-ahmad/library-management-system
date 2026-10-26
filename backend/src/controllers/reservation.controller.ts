import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservation.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const reservationController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await reservationService.list(req.query as never, req as never);
      ApiResponseUtil.success(res, result.reservations, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reservation = await reservationService.create(req.body, req as never);
      ApiResponseUtil.created(res, reservation, 'Book reserved successfully');
    } catch (error) {
      next(error);
    }
  },

  cancel: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reservation = await reservationService.cancel(req.params.id as string, req as never);
      ApiResponseUtil.success(res, reservation, 'Reservation cancelled');
    } catch (error) {
      next(error);
    }
  },

  complete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reservation = await reservationService.complete(req.params.id as string, req as never);
      ApiResponseUtil.success(res, reservation, 'Reservation completed');
    } catch (error) {
      next(error);
    }
  },
};
