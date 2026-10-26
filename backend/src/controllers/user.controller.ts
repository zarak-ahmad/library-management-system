import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthRequest } from '../types/express.d';

export const userController = {
  listStudents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.listStudents(req.query as never);
      ApiResponseUtil.success(res, result.students, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  getStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await userService.getStudentById(req.params.id as string);
      ApiResponseUtil.success(res, student);
    } catch (error) {
      next(error);
    }
  },

  createStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await userService.createStudent(req.body, req as AuthRequest);
      ApiResponseUtil.created(res, student, 'Student created successfully');
    } catch (error) {
      next(error);
    }
  },

  updateStudent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await userService.updateStudent(
        req.params.id as string,
        req.body,
        req as AuthRequest
      );
      ApiResponseUtil.success(res, student, 'Student updated successfully');
    } catch (error) {
      next(error);
    }
  },

  updateStudentStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await userService.updateStudentStatus(
        req.params.id as string,
        req.body,
        req as AuthRequest
      );
      ApiResponseUtil.success(res, student, 'Student status updated successfully');
    } catch (error) {
      next(error);
    }
  },

  listLibrarians: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.listLibrarians(req.query as never);
      ApiResponseUtil.success(res, result.librarians, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  },

  getLibrarian: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const librarian = await userService.getLibrarianById(req.params.id as string);
      ApiResponseUtil.success(res, librarian);
    } catch (error) {
      next(error);
    }
  },

  createLibrarian: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const librarian = await userService.createLibrarian(req.body, req as AuthRequest);
      ApiResponseUtil.created(res, librarian, 'Librarian created successfully');
    } catch (error) {
      next(error);
    }
  },

  updateLibrarian: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const librarian = await userService.updateLibrarian(
        req.params.id as string,
        req.body,
        req as AuthRequest
      );
      ApiResponseUtil.success(res, librarian, 'Librarian updated successfully');
    } catch (error) {
      next(error);
    }
  },

  deactivateLibrarian: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.deactivateLibrarian(
        req.params.id as string,
        req as AuthRequest
      );
      ApiResponseUtil.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const profile = await userService.getProfile(authReq.user.id);
      ApiResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const profile = await userService.updateProfile(
        authReq.user.id,
        req.body,
        authReq
      );
      ApiResponseUtil.success(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  },
};
