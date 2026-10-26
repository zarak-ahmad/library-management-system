import { Request } from 'express';
import { AuthenticatedUser } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthRequest extends Request {
  user: AuthenticatedUser;
}
