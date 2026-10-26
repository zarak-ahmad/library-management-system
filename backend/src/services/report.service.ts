import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { FilterQuery } from 'mongoose';
import { Book, IBook } from '../models/Book.model';
import { User } from '../models/User.model';
import { BorrowTransaction } from '../models/BorrowTransaction.model';
import { Fine } from '../models/Fine.model';
import { Reservation } from '../models/Reservation.model';
import { AuditLog } from '../models/AuditLog.model';
import { ApiError } from '../utils/ApiError';
import { ReportQuery, ReportType, parseDateRange } from '../validators/report.validator';

export interface ReportResult {
  title: string;
  headers: string[];
  rows: string[][];
  summary?: Record<string, string | number>;
  generatedAt: string;
}

const formatDate = (d?: Date | string): string =>
  d ? new Date(d).toLocaleDateString() : '—';

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildDateFilter = (
  field: string,
  start?: Date,
  end?: Date
): Record<string, unknown> => {
  if (!start && !end) return {};
  const range: Record<string, Date> = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return { [field]: range };
};

export const reportService = {
  generate: async (type: ReportType, query: ReportQuery): Promise<ReportResult> => {
    const { start, end } = parseDateRange(query);
    const generatedAt = new Date().toISOString();

    switch (type) {
      case 'inventory':
        return reportService.inventoryReport(query, generatedAt);
      case 'borrowing':
        return reportService.borrowingReport(start, end, query, generatedAt);
      case 'fines':
        return reportService.finesReport(start, end, query, generatedAt);
      case 'student-activity':
        return reportService.studentActivityReport(start, end, query, generatedAt);
      case 'reservations':
        return reportService.reservationsReport(start, end, query, generatedAt);
      case 'overdue':
        return reportService.overdueReport(query, generatedAt);
      case 'librarian-activity':
        return reportService.librarianActivityReport(start, end, query, generatedAt);
      default:
        throw ApiError.badRequest('Invalid report type');
    }
  },

  inventoryReport: async (query: ReportQuery, generatedAt: string): Promise<ReportResult> => {
    const filter: FilterQuery<IBook> = { deletedAt: { $exists: false } };
    if (query.status) filter.status = query.status as IBook['status'];

    const books = await Book.find(filter)
      .populate([{ path: 'genre', select: 'name' }, { path: 'category', select: 'name' }])
      .sort({ title: 1 })
      .limit(query.limit);

    const headers = [
      'Book ID',
      'Title',
      'Author',
      'Genre',
      'Category',
      'Total',
      'Available',
      'Borrowed',
      'Status',
    ];

    const rows = books.map((b) => [
      b.bookId,
      b.title,
      b.author,
      (b.genre as any)?.name || '',
      (b.category as any)?.name || '',
      String(b.totalCopies),
      String(b.availableCopies),
      String(b.borrowedCopies),
      b.status,
    ]);

    return {
      title: 'Inventory Report',
      headers,
      rows,
      summary: { totalBooks: books.length },
      generatedAt,
    };
  },

  borrowingReport: async (
    start: Date | undefined,
    end: Date | undefined,
    query: ReportQuery,
    generatedAt: string
  ): Promise<ReportResult> => {
    const filter: FilterQuery<any> = {
      ...buildDateFilter('issueDate', start, end),
    };
    if (query.status) filter.status = query.status;

    const transactions = await BorrowTransaction.find(filter)
      .populate([
        { path: 'student', select: 'fullName studentProfile' },
        { path: 'book', select: 'title bookId' },
      ])
      .sort({ issueDate: -1 })
      .limit(query.limit);

    if (query.department) {
      // filter in memory after populate if department specified
    }

    const headers = [
      'Transaction ID',
      'Student',
      'Book',
      'Issue Date',
      'Due Date',
      'Return Date',
      'Status',
      'Fine',
    ];

    let filtered = transactions;
    if (query.department) {
      filtered = transactions.filter(
        (t) =>
          (t.student as any)?.studentProfile?.department?.toLowerCase() ===
          query.department!.toLowerCase()
      );
    }

    const rows = filtered.map((t) => [
      t.transactionId,
      (t.student as any)?.fullName || '',
      (t.book as any)?.title || '',
      formatDate(t.issueDate),
      formatDate(t.dueDate),
      formatDate(t.returnDate),
      t.status,
      String(t.fineAmount || 0),
    ]);

    return {
      title: 'Borrowing Report',
      headers,
      rows,
      summary: { totalTransactions: rows.length },
      generatedAt,
    };
  },

  finesReport: async (
    start: Date | undefined,
    end: Date | undefined,
    query: ReportQuery,
    generatedAt: string
  ): Promise<ReportResult> => {
    const filter: FilterQuery<any> = {
      ...buildDateFilter('createdAt', start, end),
    };
    if (query.status) filter.paymentStatus = query.status;

    const fines = await Fine.find(filter)
      .populate({ path: 'student', select: 'fullName studentProfile' })
      .sort({ createdAt: -1 })
      .limit(query.limit);

    const headers = ['Fine ID', 'Student', 'Amount', 'Overdue Days', 'Status', 'Created'];

    let filtered = fines;
    if (query.department) {
      filtered = fines.filter(
        (f) =>
          (f.student as any)?.studentProfile?.department?.toLowerCase() ===
          query.department!.toLowerCase()
      );
    }

    const rows = filtered.map((f) => [
      f.fineId,
      (f.student as any)?.fullName || '',
      String(f.amount),
      String(f.overdueDays),
      f.paymentStatus,
      formatDate(f.createdAt),
    ]);

    const totalAmount = filtered.reduce((sum, f) => sum + f.amount, 0);

    return {
      title: 'Fine Report',
      headers,
      rows,
      summary: { totalFines: rows.length, totalAmount },
      generatedAt,
    };
  },

  studentActivityReport: async (
    start: Date | undefined,
    end: Date | undefined,
    query: ReportQuery,
    generatedAt: string
  ): Promise<ReportResult> => {
    const studentFilter: FilterQuery<any> = {
      role: 'student',
      deletedAt: { $exists: false },
    };
    if (query.department) {
      studentFilter['studentProfile.department'] = new RegExp(`^${query.department}$`, 'i');
    }
    if (query.status) studentFilter.status = query.status;

    const students = await User.find(studentFilter).sort({ fullName: 1 }).limit(query.limit);

    const headers = ['Registration No.', 'Name', 'Department', 'Status', 'Borrows', 'Returns', 'Fines'];

    const rows = await Promise.all(
      students.map(async (s) => {
        const txnFilter = {
          student: s._id,
          ...buildDateFilter('issueDate', start, end),
        };
        const [borrows, returns, fineCount] = await Promise.all([
          BorrowTransaction.countDocuments({ ...txnFilter, status: { $in: ['borrowed', 'overdue'] } }),
          BorrowTransaction.countDocuments({ ...txnFilter, status: 'returned' }),
          Fine.countDocuments({ student: s._id, ...buildDateFilter('createdAt', start, end) }),
        ]);
        return [
          s.studentProfile?.registrationNumber || '',
          s.fullName,
          s.studentProfile?.department || '',
          s.status,
          String(borrows),
          String(returns),
          String(fineCount),
        ];
      })
    );

    return {
      title: 'Student Activity Report',
      headers,
      rows,
      summary: { totalStudents: rows.length },
      generatedAt,
    };
  },

  reservationsReport: async (
    start: Date | undefined,
    end: Date | undefined,
    query: ReportQuery,
    generatedAt: string
  ): Promise<ReportResult> => {
    const filter: FilterQuery<any> = {
      ...buildDateFilter('reservationDate', start, end),
    };
    if (query.status) filter.status = query.status;

    const reservations = await Reservation.find(filter)
      .populate([
        { path: 'student', select: 'fullName' },
        { path: 'book', select: 'title bookId' },
      ])
      .sort({ reservationDate: -1 })
      .limit(query.limit);

    const headers = ['Reservation ID', 'Student', 'Book', 'Date', 'Expiry', 'Status'];

    const rows = reservations.map((r) => [
      r.reservationId,
      (r.student as any)?.fullName || '',
      (r.book as any)?.title || '',
      formatDate(r.reservationDate),
      formatDate(r.expiryDate),
      r.status,
    ]);

    return {
      title: 'Reservation Report',
      headers,
      rows,
      summary: { totalReservations: rows.length },
      generatedAt,
    };
  },

  overdueReport: async (query: ReportQuery, generatedAt: string): Promise<ReportResult> => {
    const filter: FilterQuery<any> = { status: { $in: ['borrowed', 'overdue'] } };

    const transactions = await BorrowTransaction.find(filter)
      .populate([
        { path: 'student', select: 'fullName email studentProfile' },
        { path: 'book', select: 'title bookId' },
      ])
      .sort({ dueDate: 1 })
      .limit(query.limit);

    const now = new Date();
    const headers = ['Transaction ID', 'Student', 'Book', 'Due Date', 'Days Overdue', 'Status'];

    let filtered = transactions.filter((t) => t.dueDate < now || t.status === 'overdue');
    if (query.department) {
      filtered = filtered.filter(
        (t) =>
          (t.student as any)?.studentProfile?.department?.toLowerCase() ===
          query.department!.toLowerCase()
      );
    }

    const rows = filtered.map((t) => {
      const daysOverdue = Math.max(
        0,
        Math.ceil((now.getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      );
      return [
        t.transactionId,
        (t.student as any)?.fullName || '',
        (t.book as any)?.title || '',
        formatDate(t.dueDate),
        String(daysOverdue),
        t.status,
      ];
    });

    return {
      title: 'Overdue Books Report',
      headers,
      rows,
      summary: { totalOverdue: rows.length },
      generatedAt,
    };
  },

  librarianActivityReport: async (
    start: Date | undefined,
    end: Date | undefined,
    query: ReportQuery,
    generatedAt: string
  ): Promise<ReportResult> => {
    const librarians = await User.find({
      role: { $in: ['librarian', 'admin'] },
      deletedAt: { $exists: false },
    }).select('_id fullName role');

    const librarianIds = librarians.map((l) => l._id);

    const filter: FilterQuery<any> = {
      user: { $in: librarianIds },
      ...buildDateFilter('timestamp', start, end),
    };

    const logs = await AuditLog.find(filter)
      .populate({ path: 'user', select: 'fullName role' })
      .sort({ timestamp: -1 })
      .limit(query.limit);

    const headers = ['Timestamp', 'Staff', 'Action', 'Entity', 'Entity ID'];

    const rows = logs.map((l) => [
      new Date(l.timestamp).toLocaleString(),
      (l.user as any)?.fullName || '',
      l.action,
      l.entity,
      l.entityId?.toString() || '',
    ]);

    return {
      title: 'Librarian Activity Report',
      headers,
      rows,
      summary: { totalActions: rows.length },
      generatedAt,
    };
  },
};

export const exportReportToPdf = (report: ReportResult): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(report.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, {
      align: 'center',
    });
    doc.moveDown();

    if (report.summary) {
      Object.entries(report.summary).forEach(([key, value]) => {
        doc.fontSize(10).text(`${key}: ${value}`);
      });
      doc.moveDown();
    }

    const colWidth = (doc.page.width - 80) / report.headers.length;

    doc.fontSize(9).fillColor('#333');
    let x = 40;
    report.headers.forEach((header) => {
      doc.text(header, x, doc.y, { width: colWidth, continued: false });
      x += colWidth;
    });
    doc.moveDown(0.5);

    report.rows.forEach((row) => {
      if (doc.y > doc.page.height - 60) doc.addPage();
      x = 40;
      const rowY = doc.y;
      row.forEach((value) => {
        doc.text(cell(value), x, rowY, { width: colWidth, continued: false });
        x += colWidth;
      });
      doc.moveDown(0.5);
    });

    doc.end();
  });
};

export const exportReportToExcel = async (report: ReportResult): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(report.title.slice(0, 31));

  sheet.addRow([report.title]);
  sheet.addRow([`Generated: ${new Date(report.generatedAt).toLocaleString()}`]);
  sheet.addRow([]);

  if (report.summary) {
    Object.entries(report.summary).forEach(([key, value]) => {
      sheet.addRow([key, value]);
    });
    sheet.addRow([]);
  }

  sheet.addRow(report.headers);
  const headerRow = sheet.lastRow;
  if (headerRow) {
    headerRow.font = { bold: true };
  }

  report.rows.forEach((row) => sheet.addRow(row));

  sheet.columns.forEach((column) => {
    column.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
