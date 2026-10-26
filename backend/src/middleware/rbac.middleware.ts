import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Permission, ROLE_PERMISSIONS, UserRole } from '../types';

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient role permissions'));
    }

    next();
  };
};

export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = permissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};

export const requireActiveStatus = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }

  if (req.user.status === 'pending_verification') {
    return next(ApiError.forbidden('Please verify your email before proceeding'));
  }

  next();
};

export const requireBorrowingAllowed = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }

  if (req.user.status === 'blocked' || req.user.status === 'suspended') {
    return next(
      ApiError.forbidden(
        `Your account is ${req.user.status}. Borrowing actions are not allowed.`
      )
    );
  }

  next();
};
