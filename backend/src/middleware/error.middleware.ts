import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR',
    });
    return;
  }

  if (err.message?.includes('Only JPEG, PNG, WebP, and GIF images are allowed')) {
    res.status(400).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR',
    });
    return;
  }

  if (err.message?.includes('Only CSV, Excel (.xlsx), or PDF files are allowed for import')) {
    res.status(400).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR',
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      errors: err.message,
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      code: 'INVALID_ID',
    });
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    const keyPattern = (err as { keyPattern?: Record<string, number> }).keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : 'field';
    res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
      code: 'DUPLICATE_KEY',
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'NOT_FOUND',
  });
};
