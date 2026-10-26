import { Request, Response, NextFunction } from 'express';
import { genreService } from '../services/genre.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const genreController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const genres = await genreService.list(includeInactive);
      ApiResponseUtil.success(res, genres);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const genre = await genreService.getById(req.params.id as string);
      ApiResponseUtil.success(res, genre);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const genre = await genreService.create(req.body, req as never);
      ApiResponseUtil.created(res, genre, 'Genre created successfully');
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const genre = await genreService.update(req.params.id as string, req.body, req as never);
      ApiResponseUtil.success(res, genre, 'Genre updated successfully');
    } catch (error) {
      next(error);
    }
  },

  deactivate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await genreService.deactivate(req.params.id as string, req as never);
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },
};
