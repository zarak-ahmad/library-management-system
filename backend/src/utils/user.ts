import { User } from '../models/User.model';

export const sanitizeUser = (user: InstanceType<typeof User>) => ({
  id: user._id.toString(),
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
  statusReason: user.statusReason,
  statusUpdatedAt: user.statusUpdatedAt,
  phone: user.phone,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  firstLoginCompleted: user.firstLoginCompleted,
  passwordLastChangedAt: user.passwordLastChangedAt,
  lastLoginAt: user.lastLoginAt,
  studentProfile: user.studentProfile,
  librarianProfile: user.librarianProfile,
  adminProfile: user.adminProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
