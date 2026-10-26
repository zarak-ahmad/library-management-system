import mongoose, { FilterQuery } from 'mongoose';
import { User, IUser } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { generateRandomPassword, hashPassword } from '../utils/password';
import { sanitizeUser } from '../utils/user';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { createAuditLog } from './audit.service';
import {
  sendAccountStatusEmail,
  sendLibrarianWelcomeEmail,
  sendWelcomeEmail,
} from './email.service';
import { AuthRequest } from '../types/express.d';
import {
  CreateLibrarianInput,
  CreateStudentInput,
  ListUsersQuery,
  UpdateLibrarianInput,
  UpdateProfileInput,
  UpdateStudentInput,
  UpdateStudentStatusInput,
} from '../validators/user.validator';

const buildStudentFilter = (query: ListUsersQuery): FilterQuery<IUser> => {
  const filter: FilterQuery<IUser> = {
    role: 'student',
    deletedAt: { $exists: false },
  };

  if (query.status) filter.status = query.status;
  if (query.department) filter['studentProfile.department'] = query.department;

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [
      { fullName: regex },
      { email: regex },
      { 'studentProfile.registrationNumber': regex },
      { 'studentProfile.department': regex },
    ];
  }

  return filter;
};

const buildLibrarianFilter = (query: ListUsersQuery): FilterQuery<IUser> => {
  const filter: FilterQuery<IUser> = {
    role: 'librarian',
    deletedAt: { $exists: false },
  };

  if (query.status) filter.status = query.status;

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [
      { fullName: regex },
      { email: regex },
      { 'librarianProfile.employeeId': regex },
      { 'librarianProfile.department': regex },
    ];
  }

  return filter;
};

export const userService = {
  async listStudents(query: ListUsersQuery) {
    const { skip, limit, page, sort } = parsePagination(query);
    const filter = buildStudentFilter(query);

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      students: users.map(sanitizeUser),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  async getStudentById(id: string) {
    const user = await User.findOne({
      _id: id,
      role: 'student',
      deletedAt: { $exists: false },
    });

    if (!user) throw ApiError.notFound('Student not found');
    return sanitizeUser(user);
  },

  async createStudent(input: CreateStudentInput, req: AuthRequest) {
    const existingEmail = await User.findOne({ email: input.email.toLowerCase() });
    if (existingEmail) throw ApiError.conflict('Email already registered');

    const existingReg = await User.findOne({
      'studentProfile.registrationNumber': input.registrationNumber,
    });
    if (existingReg) throw ApiError.conflict('Registration number already exists');

    const temporaryPassword = generateRandomPassword();
    const user = await User.create({
      email: input.email.toLowerCase(),
      password: await hashPassword(temporaryPassword),
      role: 'student',
      fullName: input.fullName,
      phone: input.phone || undefined,
      status: 'active',
      firstLoginCompleted: false,
      isEmailVerified: true,
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

    await createAuditLog(req, 'student.create', 'User', user._id.toString(), {
      registrationNumber: input.registrationNumber,
    });

    return sanitizeUser(user);
  },

  async updateStudent(id: string, input: UpdateStudentInput, req: AuthRequest) {
    const user = await User.findOne({
      _id: id,
      role: 'student',
      deletedAt: { $exists: false },
    });

    if (!user) throw ApiError.notFound('Student not found');

    if (input.email && input.email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: input.email.toLowerCase() });
      if (existing) throw ApiError.conflict('Email already in use');
      user.email = input.email.toLowerCase();
    }

    if (input.fullName) user.fullName = input.fullName;
    if (input.phone !== undefined) user.phone = input.phone || undefined;
    if (input.department) user.studentProfile!.department = input.department;
    if (input.address) user.studentProfile!.address = input.address;

    await user.save();

    await createAuditLog(req, 'student.update', 'User', user._id.toString());

    return sanitizeUser(user);
  },

  async updateStudentStatus(
    id: string,
    input: UpdateStudentStatusInput,
    req: AuthRequest
  ) {
    const user = await User.findOne({
      _id: id,
      role: 'student',
      deletedAt: { $exists: false },
    });

    if (!user) throw ApiError.notFound('Student not found');

    const previousStatus = user.status;
    user.status = input.status;
    user.statusReason = input.reason;
    user.statusUpdatedBy = new mongoose.Types.ObjectId(req.user.id);
    user.statusUpdatedAt = new Date();
    await user.save();

    if (previousStatus !== input.status) {
      await sendAccountStatusEmail(user.email, user.fullName, input.status, input.reason);
    }

    await createAuditLog(req, 'student.status_change', 'User', user._id.toString(), {
      previousStatus,
      newStatus: input.status,
      reason: input.reason,
    });

    return sanitizeUser(user);
  },

  async listLibrarians(query: ListUsersQuery) {
    const { skip, limit, page, sort } = parsePagination(query);
    const filter = buildLibrarianFilter(query);

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      librarians: users.map(sanitizeUser),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  async getLibrarianById(id: string) {
    const user = await User.findOne({
      _id: id,
      role: 'librarian',
      deletedAt: { $exists: false },
    });

    if (!user) throw ApiError.notFound('Librarian not found');
    return sanitizeUser(user);
  },

  async createLibrarian(input: CreateLibrarianInput, req: AuthRequest) {
    const existingEmail = await User.findOne({ email: input.email.toLowerCase() });
    if (existingEmail) throw ApiError.conflict('Email already registered');

    const existingEmp = await User.findOne({
      'librarianProfile.employeeId': input.employeeId,
    });
    if (existingEmp) throw ApiError.conflict('Employee ID already exists');

    const temporaryPassword = generateRandomPassword();
    const user = await User.create({
      email: input.email.toLowerCase(),
      password: await hashPassword(temporaryPassword),
      role: 'librarian',
      fullName: input.fullName,
      phone: input.phone || undefined,
      status: 'active',
      firstLoginCompleted: false,
      isEmailVerified: true,
      librarianProfile: {
        employeeId: input.employeeId,
        department: input.department,
      },
    });

    await sendLibrarianWelcomeEmail(
      user.email,
      user.fullName,
      input.employeeId,
      temporaryPassword
    );

    await createAuditLog(req, 'librarian.create', 'User', user._id.toString(), {
      employeeId: input.employeeId,
    });

    return sanitizeUser(user);
  },

  async updateLibrarian(id: string, input: UpdateLibrarianInput, req: AuthRequest) {
    const user = await User.findOne({
      _id: id,
      role: 'librarian',
      deletedAt: { $exists: false },
    });

    if (!user) throw ApiError.notFound('Librarian not found');

    if (input.email && input.email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: input.email.toLowerCase() });
      if (existing) throw ApiError.conflict('Email already in use');
      user.email = input.email.toLowerCase();
    }

    if (input.fullName) user.fullName = input.fullName;
    if (input.phone !== undefined) user.phone = input.phone || undefined;
    if (input.department) user.librarianProfile!.department = input.department;

    await user.save();

    await createAuditLog(req, 'librarian.update', 'User', user._id.toString());

    return sanitizeUser(user);
  },

  async deactivateLibrarian(id: string, req: AuthRequest) {
    const user = await User.findOne({
      _id: id,
      role: 'librarian',
      deletedAt: { $exists: false },
    });

    if (!user) throw ApiError.notFound('Librarian not found');

    user.deletedAt = new Date();
    user.status = 'suspended';
    user.statusReason = 'Account deactivated by administrator';
    user.statusUpdatedBy = new mongoose.Types.ObjectId(req.user.id);
    user.statusUpdatedAt = new Date();
    await user.save();

    await createAuditLog(req, 'librarian.deactivate', 'User', user._id.toString());

    return { message: 'Librarian deactivated successfully' };
  },

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) throw ApiError.notFound('User not found');
    return sanitizeUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput, req: AuthRequest) {
    const user = await User.findById(userId);
    if (!user || user.deletedAt) throw ApiError.notFound('User not found');

    if (input.fullName) user.fullName = input.fullName;
    if (input.phone !== undefined) user.phone = input.phone || undefined;
    if (input.address && user.role === 'student' && user.studentProfile) {
      user.studentProfile.address = input.address;
    }

    await user.save();

    await createAuditLog(req, 'profile.update', 'User', user._id.toString());

    return sanitizeUser(user);
  },
};
