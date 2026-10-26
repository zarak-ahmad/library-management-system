import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category.service';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const categoryController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await categoryService.list(includeInactive);
      ApiResponseUtil.success(res, categories);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.getById(req.params.id as string);
      ApiResponseUtil.success(res, category);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.create(req.body, req as never);
      ApiResponseUtil.created(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.update(
        req.params.id as string,
        req.body,
        req as never
      );
      ApiResponseUtil.success(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  },

  deactivate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await categoryService.deactivate(req.params.id as string, req as never);
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },
};
