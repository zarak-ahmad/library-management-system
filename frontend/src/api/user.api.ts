import api from './axios';
import { ApiResponse, PaginationMeta, User } from '@/types';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  sort?: string;
}

export interface CreateStudentData {
  registrationNumber: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  address: string;
}

export interface UpdateStudentData {
  fullName?: string;
  email?: string;
  phone?: string;
  department?: string;
  address?: string;
}

export interface CreateLibrarianData {
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
}

export interface UpdateLibrarianData {
  fullName?: string;
  email?: string;
  phone?: string;
  department?: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  address?: string;
}

export interface UpdateStatusData {
  status: 'active' | 'blocked' | 'suspended' | 'pending_verification';
  reason: string;
}

export const userApi = {
  listStudents: async (params: ListUsersParams = {}) => {
    const { data } = await api.get<ApiResponse<User[]> & { meta?: PaginationMeta }>(
      '/users/students',
      { params }
    );
    return data;
  },

  getStudent: async (id: string) => {
    const { data } = await api.get<ApiResponse<User>>(`/users/students/${id}`);
    return data;
  },

  createStudent: async (payload: CreateStudentData) => {
    const { data } = await api.post<ApiResponse<User>>('/users/students', payload);
    return data;
  },

  updateStudent: async (id: string, payload: UpdateStudentData) => {
    const { data } = await api.put<ApiResponse<User>>(`/users/students/${id}`, payload);
    return data;
  },

  updateStudentStatus: async (id: string, payload: UpdateStatusData) => {
    const { data } = await api.patch<ApiResponse<User>>(`/users/students/${id}/status`, payload);
    return data;
  },

  listLibrarians: async (params: ListUsersParams = {}) => {
    const { data } = await api.get<ApiResponse<User[]> & { meta?: PaginationMeta }>(
      '/users/librarians',
      { params }
    );
    return data;
  },

  getLibrarian: async (id: string) => {
    const { data } = await api.get<ApiResponse<User>>(`/users/librarians/${id}`);
    return data;
  },

  createLibrarian: async (payload: CreateLibrarianData) => {
    const { data } = await api.post<ApiResponse<User>>('/users/librarians', payload);
    return data;
  },

  updateLibrarian: async (id: string, payload: UpdateLibrarianData) => {
    const { data } = await api.put<ApiResponse<User>>(`/users/librarians/${id}`, payload);
    return data;
  },

  deactivateLibrarian: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/users/librarians/${id}`);
    return data;
  },

  getProfile: async () => {
    const { data } = await api.get<ApiResponse<User>>('/users/profile');
    return data;
  },

  updateProfile: async (payload: UpdateProfileData) => {
    const { data } = await api.put<ApiResponse<User>>('/users/profile', payload);
    return data;
  },
};
