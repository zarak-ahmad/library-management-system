import api from './axios';
import { ApiResponse } from '@/types';

export type SupportCategory =
  | 'account_blocked'
  | 'fine_appeal'
  | 'reactivation_request'
  | 'incorrect_fine'
  | 'borrowing_restriction_appeal'
  | 'lost_book'
  | 'profile_correction'
  | 'general_inquiry';

export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SupportStatus =
  | 'open'
  | 'under_review'
  | 'waiting_for_student'
  | 'resolved'
  | 'rejected';

export interface SupportTicket {
  id: string;
  requestId: string;
  student: {
    id?: string;
    fullName: string;
    email?: string;
    studentProfile?: { registrationNumber: string };
    status?: string;
  };
  subject: string;
  category: SupportCategory;
  description: string;
  attachment?: { url: string; filename: string };
  priority: SupportPriority;
  status: SupportStatus;
  assignedTo?: { id?: string; fullName: string; role?: string };
  resolvedAt?: string;
  resolvedBy?: { fullName: string };
  resolutionNotes?: string;
  submittedDate: string;
  createdAt?: string;
}

export interface SupportTimelineEntry {
  id: string;
  action: string;
  performedBy?: { fullName: string; role?: string };
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
  timestamp: string;
}

export interface SupportSummary {
  open: number;
  underReview: number;
  waiting: number;
  resolved: number;
  rejected: number;
  total: number;
}

export interface ListSupportParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  priority?: string;
}

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  account_blocked: 'Account Blocked',
  fine_appeal: 'Fine Appeal',
  reactivation_request: 'Reactivation Request',
  incorrect_fine: 'Incorrect Fine',
  borrowing_restriction_appeal: 'Borrowing Restriction Appeal',
  lost_book: 'Lost Book',
  profile_correction: 'Profile Correction',
  general_inquiry: 'General Inquiry',
};

export const supportApi = {
  list: async (params: ListSupportParams = {}) => {
    const { data } = await api.get<ApiResponse<SupportTicket[]>>('/support', { params });
    return data;
  },

  getSummary: async () => {
    const { data } = await api.get<ApiResponse<SupportSummary>>('/support/summary');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<
      ApiResponse<{ ticket: SupportTicket; timeline: SupportTimelineEntry[] }>
    >(`/support/${id}`);
    return data;
  },

  create: async (payload: {
    subject: string;
    category: SupportCategory;
    description: string;
    priority?: SupportPriority;
    attachment?: File;
  }) => {
    const formData = new FormData();
    formData.append('subject', payload.subject);
    formData.append('category', payload.category);
    formData.append('description', payload.description);
    formData.append('priority', payload.priority || 'medium');
    if (payload.attachment) formData.append('attachment', payload.attachment);

    const { data } = await api.post<ApiResponse<SupportTicket>>('/support', formData);
    return data;
  },

  assign: async (id: string, assignedTo: string) => {
    const { data } = await api.patch<ApiResponse<SupportTicket>>(`/support/${id}/assign`, {
      assignedTo,
    });
    return data;
  },

  updateStatus: async (id: string, status: SupportStatus, notes?: string) => {
    const { data } = await api.patch<ApiResponse<SupportTicket>>(`/support/${id}/status`, {
      status,
      notes,
    });
    return data;
  },

  addComment: async (id: string, notes: string) => {
    const { data } = await api.post<ApiResponse<SupportTicket>>(`/support/${id}/comments`, {
      notes,
    });
    return data;
  },

  resolve: async (id: string, resolutionNotes: string, status: 'resolved' | 'rejected' = 'resolved') => {
    const { data } = await api.patch<ApiResponse<SupportTicket>>(`/support/${id}/resolve`, {
      resolutionNotes,
      status,
    });
    return data;
  },

  reopen: async (id: string, notes: string) => {
    const { data } = await api.patch<ApiResponse<SupportTicket>>(`/support/${id}/reopen`, { notes });
    return data;
  },
};

export const getTicketStudentName = (student: SupportTicket['student'] | undefined): string =>
  student?.fullName || 'Unknown';

export const formatSupportStatus = (status: string): string =>
  status.replace(/_/g, ' ');
