import api from './axios';
import { ApiResponse, LoginResponse, User } from '@/types';

export interface RegisterData {
  registrationNumber: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  address: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    return data;
  },

  register: async (registerData: RegisterData) => {
    const { data } = await api.post<ApiResponse>('/auth/register', registerData);
    return data;
  },

  logout: async () => {
    const { data } = await api.post<ApiResponse>('/auth/logout');
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post<ApiResponse<{ temporaryPassword?: string }>>(
      '/auth/forgot-password',
      { email }
    );
    return data;
  },

  resetPassword: async (token: string, password: string, confirmPassword: string) => {
    const { data } = await api.post<ApiResponse>('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    });
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const { data } = await api.post<ApiResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return data;
  },

  firstLoginChangePassword: async (newPassword: string, confirmPassword: string) => {
    const { data } = await api.post<ApiResponse<{ redirectTo: string }>>(
      '/auth/first-login/change-password',
      { newPassword, confirmPassword }
    );
    return data;
  },

  verifyEmail: async (token: string) => {
    const { data } = await api.post<ApiResponse>(`/auth/verify-email/${token}`);
    return data;
  },
};
