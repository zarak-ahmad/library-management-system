import api from './axios';
import { ApiResponse } from '@/types';

export type ReportType =
  | 'inventory'
  | 'borrowing'
  | 'fines'
  | 'student-activity'
  | 'reservations'
  | 'overdue'
  | 'librarian-activity';

export interface ReportResult {
  title: string;
  headers: string[];
  rows: string[][];
  summary?: Record<string, string | number>;
  generatedAt: string;
}

export interface ReportParams {
  startDate?: string;
  endDate?: string;
  department?: string;
  status?: string;
  limit?: number;
}

export const REPORT_LABELS: Record<ReportType, string> = {
  inventory: 'Inventory',
  borrowing: 'Borrowing',
  fines: 'Fines',
  'student-activity': 'Student Activity',
  reservations: 'Reservations',
  overdue: 'Overdue Books',
  'librarian-activity': 'Librarian Activity',
};

export const reportApi = {
  generate: async (type: ReportType, params: ReportParams = {}) => {
    const { data } = await api.get<ApiResponse<ReportResult>>(`/reports/${type}`, { params });
    return data;
  },

  exportFile: async (type: ReportType, format: 'pdf' | 'excel', params: ReportParams = {}) => {
    const response = await api.get(`/reports/${type}/export/${format}`, {
      params,
      responseType: 'blob',
    });

    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const mime =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const blob = new Blob([response.data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-report-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
