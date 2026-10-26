import { Book } from '../models/Book.model';
import { User } from '../models/User.model';
import { BorrowTransaction } from '../models/BorrowTransaction.model';
import { BookRequest } from '../models/BookRequest.model';
import { ACTIVE_BOOK_REQUEST_STATUSES } from './bookRequestLifecycle.service';
import { Reservation } from '../models/Reservation.model';
import { Fine } from '../models/Fine.model';
import { Payment } from '../models/Payment.model';
import { SupportRequest } from '../models/SupportRequest.model';
import { AuditLog } from '../models/AuditLog.model';
import { Notification } from '../models/Notification.model';
import { getOutstandingFineTotal } from './block.service';
import { AuthRequest } from '../types/express.d';

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const sanitizeActivity = (log: any) => ({
  id: log._id.toString(),
  action: log.action,
  entity: log.entity,
  entityId: log.entityId?.toString(),
  user: log.user
    ? { fullName: log.user.fullName, role: log.user.role }
    : undefined,
  timestamp: log.timestamp,
});

const sanitizeTransaction = (txn: any) => {
  const obj = txn.toObject ? txn.toObject({ virtuals: true }) : txn;
  return {
    id: obj._id?.toString(),
    transactionId: obj.transactionId,
    student: obj.student,
    book: obj.book,
    issueDate: obj.issueDate,
    dueDate: obj.dueDate,
    status: obj.status,
  };
};

export const dashboardService = {
  getAdminStats: async () => {
    const [
      totalBooks,
      totalCopiesAgg,
      borrowedBooks,
      totalStudents,
      activeStudents,
      blockedStudents,
      pendingRequests,
      outstandingFinesAgg,
      openSupportTickets,
      recentTransactions,
      recentActivities,
    ] = await Promise.all([
      Book.countDocuments({ deletedAt: { $exists: false } }),
      Book.aggregate([
        { $match: { deletedAt: { $exists: false } } },
        { $group: { _id: null, total: { $sum: '$totalCopies' } } },
      ]),
      BorrowTransaction.countDocuments({ status: { $in: ['borrowed', 'overdue'] } }),
      User.countDocuments({ role: 'student', deletedAt: { $exists: false } }),
      User.countDocuments({ role: 'student', status: 'active', deletedAt: { $exists: false } }),
      User.countDocuments({ role: 'student', status: 'blocked', deletedAt: { $exists: false } }),
      BookRequest.countDocuments({
        status: { $in: ACTIVE_BOOK_REQUEST_STATUSES },
      }),
      Fine.aggregate([
        { $match: { paymentStatus: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      SupportRequest.countDocuments({
        status: { $in: ['open', 'under_review', 'waiting_for_student'] },
      }),
      BorrowTransaction.find({ status: { $in: ['borrowed', 'overdue', 'returned'] } })
        .populate([
          { path: 'student', select: 'fullName' },
          { path: 'book', select: 'title' },
        ])
        .sort({ updatedAt: -1 })
        .limit(50),
      AuditLog.find()
        .populate({ path: 'user', select: 'fullName role' })
        .sort({ timestamp: -1 })
        .limit(50),
    ]);

    return {
      totalBooks,
      totalCopiesOfAllBooks: totalCopiesAgg[0]?.total || 0,
      borrowedBooks,
      totalStudents,
      activeStudents,
      blockedStudents,
      pendingRequests,
      outstandingFines: outstandingFinesAgg[0]?.total || 0,
      openSupportTickets,
      recentTransactions: recentTransactions.map(sanitizeTransaction),
      recentActivities: recentActivities.map(sanitizeActivity),
    };
  },

  getLibrarianStats: async () => {
    const today = startOfToday();

    const [
      issuedBooks,
      returnedToday,
      pendingRequests,
      activeReservations,
      fineCollectionsAgg,
      totalStudents,
      openSupportTickets,
      recentActivities,
    ] = await Promise.all([
      BorrowTransaction.countDocuments({ status: { $in: ['borrowed', 'overdue'] } }),
      BorrowTransaction.countDocuments({
        status: 'returned',
        returnDate: { $gte: today },
      }),
      BookRequest.countDocuments({
        status: { $in: ACTIVE_BOOK_REQUEST_STATUSES },
      }),
      Reservation.countDocuments({ status: 'active' }),
      Payment.aggregate([
        { $match: { paymentMethod: { $in: ['cash', 'online'] }, createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.countDocuments({ role: 'student', status: 'active', deletedAt: { $exists: false } }),
      SupportRequest.countDocuments({
        status: { $in: ['open', 'under_review', 'waiting_for_student'] },
      }),
      AuditLog.find()
        .populate({ path: 'user', select: 'fullName role' })
        .sort({ timestamp: -1 })
        .limit(10),
    ]);

    return {
      issuedBooks,
      returnedToday,
      pendingRequests,
      activeReservations,
      fineCollectionsToday: fineCollectionsAgg[0]?.total || 0,
      totalStudents,
      openSupportTickets,
      recentActivities: recentActivities.map(sanitizeActivity),
    };
  },

  getStudentStats: async (req: AuthRequest) => {
    const studentId = req.user.id;

    const [
      borrowed,
      overdue,
      pendingRequests,
      activeReservations,
      outstandingTotal,
      openSupportTickets,
      unreadNotifications,
    ] = await Promise.all([
      BorrowTransaction.countDocuments({ student: studentId, status: 'borrowed' }),
      BorrowTransaction.countDocuments({ student: studentId, status: 'overdue' }),
      BookRequest.countDocuments({
        student: studentId,
        status: { $in: ACTIVE_BOOK_REQUEST_STATUSES },
      }),
      Reservation.countDocuments({ student: studentId, status: 'active' }),
      getOutstandingFineTotal(studentId),
      SupportRequest.countDocuments({
        student: studentId,
        status: { $in: ['open', 'under_review', 'waiting_for_student'] },
      }),
      Notification.countDocuments({ recipient: studentId, isRead: false }),
    ]);

    return {
      borrowedBooks: borrowed + overdue,
      overdueBooks: overdue,
      pendingRequests,
      activeReservations,
      outstandingFines: outstandingTotal,
      openSupportTickets,
      unreadNotifications,
    };
  },
};
