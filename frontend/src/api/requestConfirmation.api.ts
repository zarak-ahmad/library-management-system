import api from './axios';
import { ApiResponse } from '@/types';

export interface PublicRequestConfirmation {
  token: string;
  type: 'book_request' | 'book_issue';
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
  expiresAt: string;
  respondedAt?: string;
  canRespond: boolean;
  title: string;
  message: string;
  actionUrl: string;
  student: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  book: {
    title?: string;
    author?: string;
    isbn?: string;
    bookId?: string;
    publisher?: string;
    edition?: string;
    publishedYear?: number;
    shelfLocation?: string;
    language?: string;
    description?: string;
    coverImage?: { url: string; publicId?: string };
  };
  request: {
    id: string;
    requestId?: string;
    requestDate?: string;
    status: string;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  initiatedBy: string | null;
}

export interface PublicRequestConfirmationResponse {
  handled: boolean;
  accepted?: boolean;
  type?: 'book_request' | 'book_issue';
  message: string;
  bookRequestId?: string;
  transactionId?: string;
  request: {
    id: string;
    requestId?: string;
    status: string;
  } | null;
}

export const requestConfirmationApi = {
  get: async (token: string) => {
    const { data } = await api.get<ApiResponse<PublicRequestConfirmation>>(
      `/request-confirmations/${token}`
    );
    return data;
  },

  respond: async (token: string, accepted: boolean) => {
    const { data } = await api.post<ApiResponse<PublicRequestConfirmationResponse>>(
      `/request-confirmations/${token}/respond`,
      { accepted }
    );
    return data;
  },
};
