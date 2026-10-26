import { Request, Response, NextFunction } from 'express';
import {
  reportService,
  exportReportToPdf,
  exportReportToExcel,
} from '../services/report.service';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { reportTypes, ReportType } from '../validators/report.validator';

const isValidReportType = (type: string): type is ReportType =>
  (reportTypes as readonly string[]).includes(type);

export const reportController = {
  generate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.params.type as string;
      if (!isValidReportType(type)) {
        throw ApiError.badRequest('Invalid report type');
      }
      const report = await reportService.generate(type, req.query as never);
      ApiResponseUtil.success(res, report);
    } catch (error) {
      next(error);
    }
  },

  exportReport: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.params.type as string;
      const format = req.params.format as string;

      if (!isValidReportType(type)) {
        throw ApiError.badRequest('Invalid report type');
      }
      if (format !== 'pdf' && format !== 'excel') {
        throw ApiError.badRequest('Invalid export format. Use pdf or excel');
      }

      const report = await reportService.generate(type, req.query as never);

      if (format === 'pdf') {
        const buffer = await exportReportToPdf(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${type}-report-${Date.now()}.pdf"`
        );
        return res.send(buffer);
      }

      const buffer = await exportReportToExcel(report);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${type}-report-${Date.now()}.xlsx"`
      );
      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  },
};
