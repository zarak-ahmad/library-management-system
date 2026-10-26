import api from './axios';
import { ApiResponse, Book, Category, Genre, ListBooksParams } from '@/types';

export interface BookFormData {
  isbn: string;
  title: string;
  author: string;
  genreId: string;
  categoryId: string;
  publisher: string;
  edition?: string;
  publishedYear: number;
  language: string;
  description?: string;
  shelfLocation: string;
  totalCopies: number;
}

const buildBookFormData = (data: BookFormData, coverImage?: File): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  if (coverImage) formData.append('coverImage', coverImage);
  return formData;
};

export interface BookImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

export const bookApi = {
  list: async (params: ListBooksParams = {}) => {
    const { data } = await api.get<ApiResponse<Book[]>>('/books', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<ApiResponse<Book>>(`/books/${id}`);
    return data;
  },

  create: async (payload: BookFormData, coverImage?: File) => {
    const formData = buildBookFormData(payload, coverImage);
    const { data } = await api.post<ApiResponse<Book>>('/books', formData);
    return data;
  },

  update: async (id: string, payload: Partial<BookFormData>, coverImage?: File) => {
    const formData = buildBookFormData(payload as BookFormData, coverImage);
    const { data } = await api.put<ApiResponse<Book>>(`/books/${id}`, formData);
    return data;
  },

  adjustCopies: async (id: string, totalCopies: number) => {
    const { data } = await api.patch<ApiResponse<Book>>(`/books/${id}/copies`, { totalCopies });
    return data;
  },

  remove: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/books/${id}`);
    return data;
  },

  downloadImportTemplate: async () => {
    const response = await api.get('/books/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'books-import-template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  },

  importBooks: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ApiResponse<BookImportResult>>('/books/import', formData);
    return data;
  },
};

export const genreApi = {
  list: async (includeInactive = false) => {
    const { data } = await api.get<ApiResponse<Genre[]>>('/genres', {
      params: { includeInactive: includeInactive ? 'true' : undefined },
    });
    return data;
  },

  create: async (payload: { name: string; description?: string }) => {
    const { data } = await api.post<ApiResponse<Genre>>('/genres', payload);
    return data;
  },

  update: async (id: string, payload: { name?: string; description?: string; isActive?: boolean }) => {
    const { data } = await api.put<ApiResponse<Genre>>(`/genres/${id}`, payload);
    return data;
  },

  deactivate: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/genres/${id}`);
    return data;
  },
};

export const categoryApi = {
  list: async (includeInactive = false) => {
    const { data } = await api.get<ApiResponse<Category[]>>('/categories', {
      params: { includeInactive: includeInactive ? 'true' : undefined },
    });
    return data;
  },

  create: async (payload: { name: string; description?: string }) => {
    const { data } = await api.post<ApiResponse<Category>>('/categories', payload);
    return data;
  },

  update: async (
    id: string,
    payload: { name?: string; description?: string; isActive?: boolean }
  ) => {
    const { data } = await api.put<ApiResponse<Category>>(`/categories/${id}`, payload);
    return data;
  },

  deactivate: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/categories/${id}`);
    return data;
  },
};

export const getEntityName = (entity: { name: string } | string | undefined): string => {
  if (!entity) return '—';
  if (typeof entity === 'string') return entity;
  return entity.name;
};

export const getEntityId = (entity: { id?: string; _id?: string } | string | undefined): string => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  return entity.id || entity._id || '';
};
