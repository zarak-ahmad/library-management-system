export type UserRole = 'admin' | 'librarian' | 'student';

export type UserStatus = 'active' | 'blocked' | 'suspended' | 'pending_verification';

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

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  firstLoginCompleted: boolean;
}

export const PERMISSIONS = {
  BOOKS_CREATE: 'books:create',
  BOOKS_READ: 'books:read',
  BOOKS_UPDATE: 'books:update',
  BOOKS_DELETE: 'books:delete',
  STUDENTS_CREATE: 'students:create',
  STUDENTS_READ: 'students:read',
  STUDENTS_UPDATE: 'students:update',
  STUDENTS_DELETE: 'students:delete',
  STUDENTS_MANAGE_STATUS: 'students:manage_status',
  LIBRARIANS_CREATE: 'librarians:create',
  LIBRARIANS_READ: 'librarians:read',
  LIBRARIANS_UPDATE: 'librarians:update',
  LIBRARIANS_DELETE: 'librarians:delete',
  GENRES_MANAGE: 'genres:manage',
  CATEGORIES_MANAGE: 'categories:manage',
  BORROW_ISSUE: 'borrow:issue',
  BORROW_RETURN: 'borrow:return',
  BORROW_READ: 'borrow:read',
  REQUESTS_APPROVE: 'requests:approve',
  REQUESTS_REJECT: 'requests:reject',
  REQUESTS_READ: 'requests:read',
  REQUESTS_CREATE: 'requests:create',
  RESERVATIONS_MANAGE: 'reservations:manage',
  RESERVATIONS_READ: 'reservations:read',
  RESERVATIONS_CREATE: 'reservations:create',
  FINES_MANAGE: 'fines:manage',
  FINES_READ: 'fines:read',
  FINES_WAIVE: 'fines:waive',
  PAYMENTS_COLLECT: 'payments:collect',
  SUPPORT_MANAGE: 'support:manage',
  SUPPORT_READ: 'support:read',
  SUPPORT_CREATE: 'support:create',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  REPORTS_GENERATE: 'reports:generate',
  SETTINGS_MANAGE: 'settings:manage',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: Object.values(PERMISSIONS),
  librarian: [
    PERMISSIONS.BOOKS_CREATE,
    PERMISSIONS.BOOKS_READ,
    PERMISSIONS.BOOKS_UPDATE,
    PERMISSIONS.BOOKS_DELETE,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_UPDATE,
    PERMISSIONS.GENRES_MANAGE,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.BORROW_ISSUE,
    PERMISSIONS.BORROW_RETURN,
    PERMISSIONS.BORROW_READ,
    PERMISSIONS.REQUESTS_APPROVE,
    PERMISSIONS.REQUESTS_REJECT,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.RESERVATIONS_MANAGE,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.FINES_MANAGE,
    PERMISSIONS.FINES_READ,
    PERMISSIONS.FINES_WAIVE,
    PERMISSIONS.PAYMENTS_COLLECT,
    PERMISSIONS.SUPPORT_MANAGE,
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.REPORTS_GENERATE,
  ],
  student: [
    PERMISSIONS.BOOKS_READ,
    PERMISSIONS.BORROW_READ,
    PERMISSIONS.REQUESTS_CREATE,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_CREATE,
    PERMISSIONS.FINES_READ,
    PERMISSIONS.SUPPORT_CREATE,
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
  ],
};
