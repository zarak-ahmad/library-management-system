import api from './axios';
import { ApiResponse } from '@/types';

export interface AdminDashboardStats {
  totalBooks: number;
  totalCopiesOfAllBooks: number;
  borrowedBooks: number;
  totalStudents: number;
  activeStudents: number;
  blockedStudents: number;
  pendingRequests: number;
  outstandingFines: number;
  openSupportTickets: number;
  recentTransactions: Array<{
    id: string;
    transactionId: string;
    student?: { fullName: string };
    book?: { title: string };
    issueDate: string;
    dueDate: string;
    status: string;
  }>;
  recentActivities: DashboardActivity[];
}

export interface LibrarianDashboardStats {
  issuedBooks: number;
  returnedToday: number;
  pendingRequests: number;
  activeReservations: number;
  fineCollectionsToday: number;
  totalStudents: number;
  openSupportTickets: number;
  recentActivities: DashboardActivity[];
}

export interface StudentDashboardStats {
  borrowedBooks: number;
  overdueBooks: number;
  pendingRequests: number;
  activeReservations: number;
  outstandingFines: number;
  openSupportTickets: number;
  unreadNotifications: number;
}

export interface DashboardActivity {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  user?: { fullName: string; role: string };
  timestamp: string;
}

export const dashboardApi = {
  admin: async () => {
    const { data } = await api.get<ApiResponse<AdminDashboardStats>>('/dashboard/admin');
    return data;
  },

  librarian: async () => {
    const { data } = await api.get<ApiResponse<LibrarianDashboardStats>>('/dashboard/librarian');
    return data;
  },

  student: async () => {
    const { data } = await api.get<ApiResponse<StudentDashboardStats>>('/dashboard/student');
    return data;
  },
};
