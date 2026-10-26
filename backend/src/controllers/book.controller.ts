import { Request, Response, NextFunction } from 'express';
import { bookService } from '../services/book.service';
import { bookImportService } from '../services/bookImport.service';
import { ApiError } from '../utils/ApiError';
import { ApiResponseUtil } from '../utils/ApiResponse';

export const bookController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookService.list(req.query as never);
      ApiResponseUtil.success(res, result.books, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await bookService.getById(req.params.id as string);
      ApiResponseUtil.success(res, book);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await bookService.create(req.body, req as never, req.file);
      ApiResponseUtil.created(res, book, 'Book created successfully');
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await bookService.update(
        req.params.id as string,
        req.body,
        req as never,
        req.file
      );
      ApiResponseUtil.success(res, book, 'Book updated successfully');
    } catch (error) {
      next(error);
    }
  },

  adjustCopies: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const book = await bookService.adjustCopies(
        req.params.id as string,
        req.body,
        req as never
      );
      ApiResponseUtil.success(res, book, 'Copy count updated successfully');
    } catch (error) {
      next(error);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookService.softDelete(req.params.id as string, req as never);
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  importTemplate: (_req: Request, res: Response) => {
    const csv = bookImportService.getTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="books-import-template.csv"');
    res.send(csv);
  },

  importBooks: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw ApiError.badRequest('Import file is required');
      }
      const result = await bookImportService.importFromFile(req.file, req as never);
      ApiResponseUtil.success(res, result, `Imported ${result.imported} book(s)`);
    } catch (error) {
      next(error);
    }
  },
};
