import api from './axios';
import { ApiResponse } from '@/types';

export interface Fine {
  id: string;
  fineId: string;
  student: {
    id?: string;
    fullName: string;
    email?: string;
    studentProfile?: { registrationNumber: string };
    status?: string;
  };
  transaction: {
    transactionId: string;
    issueDate: string;
    dueDate: string;
    returnDate?: string;
    book?: { title: string; author: string; bookId?: string };
  };
  overdueDays: number;
  amount: number;
  ratePerDay: number;
  paymentStatus: 'pending' | 'paid' | 'waived';
  paymentDate?: string;
  waivedBy?: { fullName: string; role: string };
  waivedReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FineSummary {
  outstandingTotal: number;
  pendingCount: number;
  paidCount: number;
  waivedCount: number;
}

export interface FineWithPayment extends Fine {
  payment?: Payment;
}

export interface FinanceDetails {
  outstandingTotal: number;
  paidTotalCollected: number;
  waivedTotalAmount: number;
  totalDiscount: number;
  totalFinesCount: number;
  pendingCount: number;
  paidCount: number;
  waivedCount: number;
  pending: Fine[];
  paid: FineWithPayment[];
  waived: FineWithPayment[];
}

export interface Payment {
  id: string;
  paymentId: string;
  originalAmount?: number;
  discount?: number;
  amount: number;
  paymentMethod: string;
  receiptNumber?: string;
  notes?: string;
  collectedBy?: { fullName: string; role: string };
  paidAt?: string;
  createdAt: string;
}

export interface SystemSettings {
  borrowRules: {
    borrowDurationDays: number;
    maxBooksPerStudent: number;
    reservationExpiryDays: number;
  };
  fineRules: {
    ratePerDay: number;
    currency: string;
    gracePeriodDays: number;
  };
  blockRules: {
    fineThreshold: number;
    maxOverdueReturns: number;
    autoBlockEnabled: boolean;
  };
  updatedAt?: string;
}

export interface ListFinesParams {
  page?: number;
  limit?: number;
  paymentStatus?: string;
  studentId?: string;
}

export const fineApi = {
  list: async (params: ListFinesParams = {}) => {
    const { data } = await api.get<ApiResponse<Fine[]>>('/fines', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<Fine>>(`/fines/${id}`);
    return data;
  },

  getSummary: async (studentId?: string) => {
    const { data } = await api.get<ApiResponse<FineSummary>>('/fines/summary', {
      params: studentId ? { studentId } : undefined,
    });
    return data;
  },

  getFinanceDetails: async (studentId?: string) => {
    const { data } = await api.get<ApiResponse<FinanceDetails>>('/fines/finance-details', {
      params: studentId ? { studentId } : undefined,
    });
    return data;
  },

  edit: async (id: string, payload: { amount: number; notes?: string }) => {
    const { data } = await api.patch<ApiResponse<Fine>>(`/fines/${id}`, payload);
    return data;
  },

  waive: async (id: string, reason: string) => {
    const { data } = await api.post<ApiResponse<Fine>>(`/fines/${id}/waive`, { reason });
    return data;
  },

  pay: async (
    id: string,
    payload: {
      paymentMethod?: 'cash' | 'online';
      receiptNumber?: string;
      notes?: string;
      discount: number;
      amountPaid: number;
      paymentDate: string;
      paymentTime: string;
    }
  ) => {
    const { data } = await api.post<ApiResponse<{ fine: Fine; payment: Payment }>>(`/fines/${id}/pay`, payload);
    return data;
  },

  listPayments: async (fineId: string) => {
    const { data } = await api.get<ApiResponse<Payment[]>>(`/fines/${fineId}/payments`);
    return data;
  },
};

export const settingsApi = {
  get: async () => {
    const { data } = await api.get<ApiResponse<SystemSettings>>('/settings');
    return data;
  },

  updateFineRules: async (payload: Partial<SystemSettings['fineRules']>) => {
    const { data } = await api.put<ApiResponse<SystemSettings>>('/settings/fine-rules', payload);
    return data;
  },

  updateBlockRules: async (payload: Partial<SystemSettings['blockRules']>) => {
    const { data } = await api.put<ApiResponse<SystemSettings>>('/settings/block-rules', payload);
    return data;
  },

  updateBorrowRules: async (payload: Partial<SystemSettings['borrowRules']>) => {
    const { data } = await api.put<ApiResponse<SystemSettings>>('/settings/borrow-rules', payload);
    return data;
  },
};

export const getFineStudentName = (student: Fine['student'] | undefined): string =>
  student?.fullName || 'Unknown';

export const getFineBookTitle = (fine: Fine): string =>
  fine.transaction?.book?.title || 'Unknown';

export const getFineRecordId = (fine: Fine & { _id?: string }): string =>
  fine.id || fine._id || '';
