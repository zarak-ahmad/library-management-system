import mongoose, { Document, Schema } from 'mongoose';
import { UserRole, UserStatus } from '../types';

export interface IStudentProfile {
  registrationNumber: string;
  department: string;
  address: string;
}

export interface ILibrarianProfile {
  employeeId: string;
  department: string;
}

export interface IAdminProfile {
  employeeId: string;
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  avatar?: string;
  isEmailVerified: boolean;
  firstLoginCompleted: boolean;
  passwordLastChangedAt?: Date;
  lastLoginAt?: Date;
  status: UserStatus;
  statusReason?: string;
  statusUpdatedBy?: mongoose.Types.ObjectId;
  statusUpdatedAt?: Date;
  studentProfile?: IStudentProfile;
  librarianProfile?: ILibrarianProfile;
  adminProfile?: IAdminProfile;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'librarian', 'student'],
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    firstLoginCompleted: { type: Boolean, default: false },
    passwordLastChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    status: {
      type: String,
      enum: ['active', 'blocked', 'suspended', 'pending_verification'],
      default: 'active',
    },
    statusReason: { type: String },
    statusUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    statusUpdatedAt: { type: Date },
    studentProfile: {
      registrationNumber: { type: String },
      department: { type: String },
      address: { type: String },
    },
    librarianProfile: {
      employeeId: { type: String },
      department: { type: String },
    },
    adminProfile: {
      employeeId: { type: String },
    },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index(
  { 'studentProfile.registrationNumber': 1 },
  { unique: true, sparse: true }
);
userSchema.index(
  { 'librarianProfile.employeeId': 1 },
  { unique: true, sparse: true }
);

userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  return user;
};

export const User = mongoose.model<IUser>('User', userSchema);
