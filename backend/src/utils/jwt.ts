import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole, UserStatus } from '../types';

export const generateAccessToken = (payload: {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}): string => {
  const tokenPayload: JwtPayload = {
    sub: payload.userId,
    email: payload.email,
    role: payload.role,
    status: payload.status,
  };

  return jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): { sub: string } => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
};

export const getRefreshTokenExpiry = (): Date => {
  const match = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * (multipliers[unit] || multipliers.d));
};

export const getAccessTokenExpirySeconds = (): number => {
  const match = env.JWT_ACCESS_EXPIRES_IN.match(/^(\d+)([dhms])$/);
  if (!match) return 900;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * (multipliers[unit] || multipliers.m);
};
