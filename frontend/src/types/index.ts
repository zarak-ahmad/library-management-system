export type UserRole = 'admin' | 'librarian' | 'student';
export type UserStatus = 'active' | 'blocked' | 'suspended' | 'pending_verification';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  statusReason?: string;
  statusUpdatedAt?: string;
  phone?: string;
  isEmailVerified: boolean;
  firstLoginCompleted: boolean;
  passwordLastChangedAt?: string;
  lastLoginAt?: string;
  studentProfile?: {
    registrationNumber: string;
    department: string;
    address: string;
  };
  librarianProfile?: {
    employeeId: string;
    department: string;
  };
  adminProfile?: {
    employeeId: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
  redirectTo: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type BookStatus = 'available' | 'reserved' | 'borrowed' | 'out_of_stock';

export interface NamedEntity {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookCover {
  url: string;
  publicId?: string;
}

export interface Book {
  id: string;
  bookId: string;
  isbn: string;
  title: string;
  author: string;
  genre: NamedEntity | string;
  category: NamedEntity | string;
  publisher: string;
  edition?: string;
  publishedYear: number;
  language: string;
  description?: string;
  coverImage?: BookCover;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  status: BookStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListBooksParams {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  category?: string;
  status?: BookStatus;
  sort?: string;
}
