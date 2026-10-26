import api from './axios';
import { ApiResponse, Book } from '@/types';

export interface BookRequest {
  id: string;
  requestId: string;
  student: {
    id?: string;
    fullName: string;
    email?: string;
    studentProfile?: { registrationNumber: string };
    status?: string;
  };
  book: Book | {
    id?: string;
    title: string;
    author: string;
    bookId?: string;
    isbn?: string;
    availableCopies?: number;
  };
  requestDate: string;
  status: 'pending_confirm' | 'pending' | 'confirmed' | 'canceled' | 'awaiting_confirmation' | 'approved' | 'rejected';
  approvedBy?: { fullName: string };
  rejectedBy?: { fullName: string };
  remarks?: string;
  processedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BorrowTransaction {
  id: string;
  transactionId: string;
  student: { id?: string; fullName: string; email?: string; studentProfile?: { registrationNumber: string } };
  book: Book | { id?: string; title: string; author: string; bookId?: string };
  issuedBy?: { fullName: string; role?: string };
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  returnedTo?: { fullName: string; role?: string };
  status: 'borrowed' | 'returned' | 'overdue';
  fineAmount: number;
  finePaidStatus: string;
}

export interface Reservation {
  id: string;
  reservationId: string;
  student: { id?: string; fullName: string };
  book: Book | { id?: string; title: string; author: string };
  reservationDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'cancelled' | 'completed';
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  studentId?: string;
  bookId?: string;
  sort?: string;
}

export const borrowApi = {
  listRequests: async (params: ListParams = {}) => {
    const { data } = await api.get<ApiResponse<BookRequest[]>>('/book-requests', { params });
    return data;
  },

  createRequest: async (bookId: string) => {
    const { data } = await api.post<
      ApiResponse<{
        confirmationSent: boolean;
        resent?: boolean;
        confirmationToken?: string;
        expiresAt?: string;
        message: string;
        bookRequestId?: string;
        requestId?: string;
        book?: { id: string; title: string; author: string };
      }>
    >('/book-requests', { bookId });
    return data;
  },

  approveRequest: async (id: string, remarks?: string) => {
    const { data } = await api.patch<
      ApiResponse<{
        confirmationSent: boolean;
        confirmationToken?: string;
        message: string;
        transactionId?: string;
        request?: BookRequest;
        transaction?: BorrowTransaction;
      }>
    >(`/book-requests/${id}/approve`, { remarks });
    return data;
  },

  rejectRequest: async (id: string, remarks?: string) => {
    const { data } = await api.patch<ApiResponse<BookRequest>>(`/book-requests/${id}/reject`, { remarks });
    return data;
  },

  cancelRequest: async (id: string) => {
    const { data } = await api.patch<ApiResponse<BookRequest>>(`/book-requests/${id}/cancel`);
    return data;
  },

  deleteRequest: async (id: string) => {
    const { data } = await api.delete<ApiResponse<{ id: string; requestId: string; deleted: boolean }>>(
      `/book-requests/${id}`
    );
    return data;
  },

  listTransactions: async (params: ListParams = {}) => {
    const { data } = await api.get<ApiResponse<BorrowTransaction[]>>('/borrow/transactions', { params });
    return data;
  },

  listOverdue: async (params: ListParams = {}) => {
    const { data } = await api.get<ApiResponse<BorrowTransaction[]>>('/borrow/overdue', { params });
    return data;
  },

  issueBook: async (payload: {
    studentId: string;
    bookId: string;
    bookRequestId?: string;
    reservationId?: string;
    issueDate?: string;
  }) => {
    const { data } = await api.post<ApiResponse<BorrowTransaction>>('/borrow/issue', payload);
    return data;
  },

  returnBook: async (transactionId: string, notes?: string) => {
    const { data } = await api.post<
      ApiResponse<{
        transaction: BorrowTransaction;
        overdueDays: number;
        fine?: { fineId: string; amount: number; overdueDays: number; paymentStatus: string };
        autoBlock?: { blocked: boolean; reason?: string };
      }>
    >('/borrow/return', { transactionId, notes });
    return data;
  },

  listReservations: async (params: ListParams = {}) => {
    const { data } = await api.get<ApiResponse<Reservation[]>>('/reservations', { params });
    return data;
  },

  createReservation: async (bookId: string) => {
    const { data } = await api.post<ApiResponse<Reservation>>('/reservations', { bookId });
    return data;
  },

  cancelReservation: async (id: string) => {
    const { data } = await api.patch<ApiResponse<Reservation>>(`/reservations/${id}/cancel`);
    return data;
  },

  listNotifications: async (page = 1, limit = 10) => {
    const { data } = await api.get<ApiResponse<Notification[]>>('/notifications', { params: { page, limit } });
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return data;
  },
};

export const getBookTitle = (book: Book | { title: string } | undefined): string =>
  book?.title || 'Unknown';

export const getBookAuthor = (book: Book | { author?: string } | undefined): string =>
  book?.author || '—';

export const getStudentName = (student: { fullName?: string } | undefined): string =>
  student?.fullName || 'Unknown';
