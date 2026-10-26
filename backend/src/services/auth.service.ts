import { Response } from 'express';
import { User } from '../models/User.model';
import { RefreshToken } from '../models/RefreshToken.model';
import { ApiError } from '../utils/ApiError';
import {
  comparePassword,
  generateRandomPassword,
  generateSecureToken,
  hashPassword,
  hashToken,
} from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpirySeconds,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from '../utils/jwt';
import {
  sendEmailVerificationEmail,
  sendForgotPasswordEmail,
  sendWelcomeEmail,
} from './email.service';
import { createAuditLog } from './audit.service';
import { AuthRequest } from '../types/express.d';
import {
  ChangePasswordInput,
  FirstLoginPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

const sanitizeUser = (user: InstanceType<typeof User>) => ({
  id: user._id.toString(),
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
  phone: user.phone,
  isEmailVerified: user.isEmailVerified,
  firstLoginCompleted: user.firstLoginCompleted,
  passwordLastChangedAt: user.passwordLastChangedAt,
  lastLoginAt: user.lastLoginAt,
  studentProfile: user.studentProfile,
  librarianProfile: user.librarianProfile,
  adminProfile: user.adminProfile,
  createdAt: user.createdAt,
});

const storeRefreshToken = async (userId: string, token: string): Promise<void> => {
  await RefreshToken.create({
    user: userId,
    token: hashToken(token),
    expiresAt: getRefreshTokenExpiry(),
  });
};

const getRedirectPath = (user: InstanceType<typeof User>): string => {
  if (user.role === 'student' && !user.firstLoginCompleted) {
    return '/auth/first-login';
  }

  switch (user.role) {
    case 'admin':
      return '/admin/dashboard';
    case 'librarian':
      return '/librarian/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/';
  }
};

export const authService = {
  async register(input: RegisterInput, req: AuthRequest) {
    const existingEmail = await User.findOne({ email: input.email.toLowerCase() });
    if (existingEmail) {
      throw ApiError.conflict('Email already registered');
    }

    const existingReg = await User.findOne({
      'studentProfile.registrationNumber': input.registrationNumber,
    });
    if (existingReg) {
      throw ApiError.conflict('Registration number already exists');
    }

    const temporaryPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(temporaryPassword);
    const verificationToken = generateSecureToken();

    const user = await User.create({
      email: input.email.toLowerCase(),
      password: hashedPassword,
      role: 'student',
      fullName: input.fullName,
      phone: input.phone,
      status: 'active',
      firstLoginCompleted: false,
      isEmailVerified: false,
      emailVerificationToken: hashToken(verificationToken),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      studentProfile: {
        registrationNumber: input.registrationNumber,
        department: input.department,
        address: input.address,
      },
    });

    await sendWelcomeEmail(
      user.email,
      user.fullName,
      input.registrationNumber,
      temporaryPassword
    );

    await sendEmailVerificationEmail(user.email, user.fullName, verificationToken);

    await createAuditLog(req, 'registration', 'User', user._id.toString(), {
      registrationNumber: input.registrationNumber,
    });

    return {
      message: 'Registration successful. Check your email for login credentials.',
      user: sanitizeUser(user),
    };
  },

  async login(input: LoginInput, req: AuthRequest) {
    const user = await User.findOne({ email: input.email.toLowerCase() })
      .select('+password');

    if (!user || user.deletedAt) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isValid = await comparePassword(input.password, user.password);
    if (!isValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const refreshToken = generateRefreshToken(user._id.toString());
    await storeRefreshToken(user._id.toString(), refreshToken);

    await createAuditLog(req, 'login', 'User', user._id.toString());

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpirySeconds(),
      redirectTo: getRedirectPath(user),
    };
  },

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const storedToken = await RefreshToken.findOne({
      token: hashToken(refreshToken),
      revokedAt: { $exists: false },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token expired or revoked');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.deletedAt) {
      throw ApiError.unauthorized('User not found');
    }

    storedToken.revokedAt = new Date();
    await storedToken.save();

    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const newRefreshToken = generateRefreshToken(user._id.toString());
    storedToken.replacedByToken = hashToken(newRefreshToken);
    await storedToken.save();
    await storeRefreshToken(user._id.toString(), newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: getAccessTokenExpirySeconds(),
    };
  },

  async logout(refreshToken: string | undefined, req: AuthRequest) {
    if (refreshToken) {
      await RefreshToken.updateOne(
        { token: hashToken(refreshToken) },
        { revokedAt: new Date() }
      );
    }

    if (req.user) {
      await createAuditLog(req, 'logout', 'User', req.user.id);
    }
  },

  async forgotPassword(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { message: 'If the email exists, a new temporary password has been sent.' };
    }

    const temporaryPassword = generateRandomPassword();
    user.password = await hashPassword(temporaryPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordLastChangedAt = new Date();
    user.firstLoginCompleted = false;
    await user.save();

    await RefreshToken.updateMany(
      { user: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    await sendForgotPasswordEmail(user.email, user.fullName, temporaryPassword);

    return {
      message: 'A new temporary password has been sent to your email.',
      temporaryPassword,
    };
  },

  async resetPassword(input: ResetPasswordInput, req: AuthRequest) {
    const user = await User.findOne({
      passwordResetToken: hashToken(input.token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    user.password = await hashPassword(input.password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordLastChangedAt = new Date();
    await user.save();

    await RefreshToken.updateMany(
      { user: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    await createAuditLog(req, 'password.reset', 'User', user._id.toString());

    return { message: 'Password reset successful. Please login with your new password.' };
  },

  async changePassword(userId: string, input: ChangePasswordInput, req: AuthRequest) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isValid = await comparePassword(input.currentPassword, user.password);
    if (!isValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    user.password = await hashPassword(input.newPassword);
    user.passwordLastChangedAt = new Date();
    await user.save();

    await createAuditLog(req, 'password.change', 'User', userId);

    return { message: 'Password changed successfully' };
  },

  async firstLoginChangePassword(
    userId: string,
    input: FirstLoginPasswordInput,
    req: AuthRequest
  ) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.firstLoginCompleted) {
      throw ApiError.badRequest('First login password change already completed');
    }

    user.password = await hashPassword(input.newPassword);
    user.firstLoginCompleted = true;
    user.passwordLastChangedAt = new Date();
    await user.save();

    await createAuditLog(req, 'password.first_login', 'User', userId);

    return {
      message: 'Password set successfully',
      redirectTo: getRedirectPath(user),
    };
  },

  async verifyEmail(token: string, req: AuthRequest) {
    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await createAuditLog(req, 'email.verify', 'User', user._id.toString());

    return { message: 'Email verified successfully' };
  },

  async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      throw ApiError.notFound('User not found');
    }
    return sanitizeUser(user);
  },
};
