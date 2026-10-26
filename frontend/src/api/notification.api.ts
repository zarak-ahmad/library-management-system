import api from './axios';
import { ApiResponse } from '@/types';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const notificationApi = {
  list: async (page = 1, limit = 20) => {
    const { data } = await api.get<ApiResponse<NotificationItem[]>>('/notifications', {
      params: { page, limit },
    });
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return data;
  },

  markRead: async (id: string) => {
    const { data } = await api.patch<ApiResponse>(`/notifications/${id}/read`);
    return data;
  },

  markAllRead: async () => {
    const { data } = await api.patch<ApiResponse>('/notifications/read-all');
    return data;
  },
};
