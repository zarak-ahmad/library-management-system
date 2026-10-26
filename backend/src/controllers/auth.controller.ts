import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthRequest } from '../types/express.d';
import { env } from '../config/env';

const REFRESH_COOKIE = 'refreshToken';

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth/refresh',
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth/refresh' });
};

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body, req as AuthRequest);
      ApiResponseUtil.created(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body, req as AuthRequest);
      setRefreshCookie(res, result.refreshToken);

      const { refreshToken: _, ...data } = result;
      ApiResponseUtil.success(res, data, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE];
      if (!token) {
        return ApiResponseUtil.success(res, null, 'No refresh token');
      }

      const result = await authService.refresh(token);
      setRefreshCookie(res, result.refreshToken);

      const { refreshToken: _, ...data } = result;
      ApiResponseUtil.success(res, data);
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE];
      await authService.logout(token, req as AuthRequest);
      clearRefreshCookie(res);
      ApiResponseUtil.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body.email);
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(req.body, req as AuthRequest);
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const result = await authService.changePassword(
        authReq.user.id,
        req.body,
        authReq
      );
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  firstLoginChangePassword: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authReq = req as AuthRequest;
      const result = await authService.firstLoginChangePassword(
        authReq.user.id,
        req.body,
        authReq
      );
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token as string;
      const result = await authService.verifyEmail(token, req as AuthRequest);
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  getMe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const user = await authService.getMe(authReq.user.id);
      ApiResponseUtil.success(res, user);
    } catch (error) {
      next(error);
    }
  },
};
