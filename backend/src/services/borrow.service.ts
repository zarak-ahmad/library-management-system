import mongoose, { FilterQuery } from 'mongoose';
import { Book } from '../models/Book.model';
import { User } from '../models/User.model';
import { BorrowTransaction, IBorrowTransaction } from '../models/BorrowTransaction.model';
import { Reservation } from '../models/Reservation.model';
import { getSystemSettings } from '../models/SystemSettings.model';
import { ApiError } from '../utils/ApiError';
import { generateSequentialId, addDays, daysBetween } from '../utils/generateId';
import {
  assertStudentCanBorrow,
  assertWithinBorrowLimit,
  getAvailableBook,
  decrementAvailableCopy,
  incrementAvailableOnReturn,
  completeReservationCopy,
} from '../utils/borrowHelpers';
import { createAuditLog } from './audit.service';
import { createNotification } from './notification.service';
import {
  sendBookApprovedEmail,
  sendDueDateReminderEmail,
  sendOverdueNoticeEmail,
} from './email.service';
import { triggerAutoBlockAfterFine, upsertPendingFineForTransaction } from './fine.service';
import { AuthRequest } from '../types/express.d';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { withTransaction, saveOptions, createOptions } from '../utils/mongoTransaction';
import { IssueBookInput, ReturnBookInput, ListTransactionsQuery } from '../validators/borrow.validator';

const populateFields = [
  { path: 'student', select: 'fullName email studentProfile' },
  { path: 'book', select: 'title author bookId isbn coverImage' },
  { path: 'issuedBy', select: 'fullName role' },
  { path: 'returnedTo', select: 'fullName role' },
];

const sanitizeTransaction = (txn: any) => {
  const obj = txn.toObject ? txn.toObject({ virtuals: true }) : txn;
  return {
    id: obj._id?.toString(),
    transactionId: obj.transactionId,
    student: obj.student,
    book: obj.book,
    issuedBy: obj.issuedBy,
    issueDate: obj.issueDate,
    dueDate: obj.dueDate,
    returnDate: obj.returnDate,
    returnedTo: obj.returnedTo,
    status: obj.status,
    fineAmount: obj.fineAmount,
    finePaidStatus: obj.finePaidStatus,
    bookRequest: obj.bookRequest?.toString?.() || obj.bookRequest,
    reservation: obj.reservation?.toString?.() || obj.reservation,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const startOfDay = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export const issueBookToStudent = async (
  params: {
    studentId: string;
    bookId: string;
    issuedBy: string;
    bookRequestId?: string;
    reservationId?: string;
    issueDate?: Date;
  },
  req?: AuthRequest
) => {
  await assertStudentCanBorrow(params.studentId);
  await assertWithinBorrowLimit(params.studentId);

  const { transaction, book, dueDate, issueDate, transactionId } = await withTransaction(async (session) => {
    const bookDoc = await getAvailableBook(params.bookId, session);
    const settings = await getSystemSettings();
    const issueDate = params.issueDate ? startOfDay(params.issueDate) : new Date();
    const due = addDays(issueDate, settings.borrowRules.borrowDurationDays);

    if (params.reservationId) {
      const reservationQuery = Reservation.findOne({
        _id: params.reservationId,
        student: params.studentId,
        book: params.bookId,
        status: 'active',
      });
      const reservation = session
        ? await reservationQuery.session(session)
        : await reservationQuery;

      if (reservation) {
        completeReservationCopy(bookDoc);
        reservation.status = 'completed';
        reservation.completedAt = new Date();
        await reservation.save(saveOptions(session));
      } else {
        decrementAvailableCopy(bookDoc);
      }
    } else {
      decrementAvailableCopy(bookDoc);
    }

    await bookDoc.save(saveOptions(session));

    const transactionId = await generateSequentialId('TXN', BorrowTransaction, 'transactionId');
    const [txn] = await BorrowTransaction.create(
      [
        {
          transactionId,
          student: params.studentId,
          book: params.bookId,
          issuedBy: params.issuedBy,
          issueDate,
          dueDate: due,
          status: 'borrowed',
          fineAmount: 0,
          finePaidStatus: 'none',
          bookRequest: params.bookRequestId,
          reservation: params.reservationId,
        },
      ],
      createOptions(session)
    );

    return { transaction: txn, book: bookDoc, dueDate: due, issueDate, transactionId };
  });

  const student = await User.findById(params.studentId);
  if (student) {
    await sendBookApprovedEmail(student.email, student.fullName, book.title, dueDate);
    await createNotification({
      recipientId: params.studentId,
      type: 'book_approved',
      title: 'Book Issued',
      message: `"${book.title}" has been issued. Due: ${dueDate.toLocaleDateString()}`,
      entityType: 'BorrowTransaction',
      entityId: transaction._id.toString(),
    });
  }

  if (req) {
    await createAuditLog(req, 'borrow.issue', 'BorrowTransaction', transaction._id.toString());
  }

  const populated = await BorrowTransaction.findById(transaction._id).populate(populateFields);
  return sanitizeTransaction(populated!);
};

export const borrowService = {
  issue: async (input: IssueBookInput, req: AuthRequest) => {
    return issueBookToStudent(
      {
        studentId: input.studentId,
        bookId: input.bookId,
        issuedBy: req.user.id,
        bookRequestId: input.bookRequestId,
        reservationId: input.reservationId,
        issueDate: input.issueDate,
      },
      req
    );
  },

  returnBook: async (input: ReturnBookInput, req: AuthRequest) => {
    const result = await withTransaction(async (session) => {
      const txnQuery = BorrowTransaction.findOne({
        _id: input.transactionId,
        status: { $in: ['borrowed', 'overdue'] },
      });
      const transaction = session ? await txnQuery.session(session) : await txnQuery;

      if (!transaction) throw ApiError.notFound('Active borrow transaction not found');

      const bookQuery = Book.findById(transaction.book);
      const book = session ? await bookQuery.session(session) : await bookQuery;
      if (!book) throw ApiError.notFound('Book not found');

      const settings = await getSystemSettings();
      const returnDate = new Date();
      const overdueDays = Math.max(
        0,
        daysBetween(transaction.dueDate, returnDate) - settings.fineRules.gracePeriodDays
      );

      incrementAvailableOnReturn(book);
      await book.save(saveOptions(session));

      transaction.returnDate = returnDate;
      transaction.returnedTo = new mongoose.Types.ObjectId(req.user.id);
      transaction.status = 'returned';

      let fine = null;
      if (overdueDays > 0) {
        const amount = overdueDays * settings.fineRules.ratePerDay;
        transaction.fineAmount = amount;
        transaction.finePaidStatus = 'pending';

        const fineDoc = await upsertPendingFineForTransaction(
          transaction,
          overdueDays,
          settings.fineRules.ratePerDay,
          input.notes
        );

        if (fineDoc) {
          fine = {
            fineId: fineDoc.fineId,
            amount: fineDoc.amount,
            overdueDays: fineDoc.overdueDays,
            paymentStatus: fineDoc.paymentStatus,
            bookTitle: book.title,
            studentId: transaction.student.toString(),
            fineDocId: fineDoc._id.toString(),
          };
        }
      }

      await transaction.save(saveOptions(session));

      return {
        transactionId: transaction._id.toString(),
        studentId: transaction.student.toString(),
        overdueDays,
        fineAmount: transaction.fineAmount,
        fine,
      };
    });

    await createAuditLog(req, 'borrow.return', 'BorrowTransaction', result.transactionId, {
      overdueDays: result.overdueDays,
      fineAmount: result.fineAmount,
    });

    if (result.fine) {
      const student = await User.findById(result.fine.studentId);
      if (student) {
        await createNotification({
          recipientId: student._id.toString(),
          type: 'fine_alert',
          title: 'Fine Generated',
          message: `Overdue fine of Rs. ${result.fine.amount} for "${result.fine.bookTitle}"`,
          entityType: 'Fine',
          entityId: result.fine.fineDocId,
        });
      }
    }

    let autoBlock: { blocked: boolean; reason?: string } | undefined;
    if (result.overdueDays > 0) {
      autoBlock = await triggerAutoBlockAfterFine(result.studentId, req);
    }

    const populated = await BorrowTransaction.findById(result.transactionId).populate(populateFields);

    return {
      transaction: sanitizeTransaction(populated!),
      overdueDays: result.overdueDays,
      fine: result.fine
        ? {
            fineId: result.fine.fineId,
            amount: result.fine.amount,
            overdueDays: result.fine.overdueDays,
            paymentStatus: result.fine.paymentStatus,
          }
        : null,
      autoBlock,
    };
  },

  listTransactions: async (query: ListTransactionsQuery, req: AuthRequest) => {
    const { skip, limit, page, sort } = parsePagination(query);
    const filter: FilterQuery<IBorrowTransaction> = {};

    if (req.user.role === 'student') {
      filter.student = req.user.id;
    } else if (query.studentId) {
      filter.student = query.studentId;
    }

    if (query.status) filter.status = query.status;
    if (query.bookId) filter.book = query.bookId;

    const [transactions, total] = await Promise.all([
      BorrowTransaction.find(filter)
        .populate(populateFields)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      BorrowTransaction.countDocuments(filter),
    ]);

    return {
      transactions: transactions.map((t) => sanitizeTransaction(t)),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  getTransaction: async (id: string, req: AuthRequest) => {
    const filter: FilterQuery<IBorrowTransaction> = { _id: id };
    if (req.user.role === 'student') filter.student = req.user.id;

    const transaction = await BorrowTransaction.findOne(filter).populate(populateFields);
    if (!transaction) throw ApiError.notFound('Transaction not found');
    return sanitizeTransaction(transaction);
  },

  listOverdue: async (query: ListTransactionsQuery) => {
    const { skip, limit, page, sort } = parsePagination(query);
    const filter: FilterQuery<IBorrowTransaction> = { status: 'overdue' };

    const [transactions, total] = await Promise.all([
      BorrowTransaction.find(filter)
        .populate(populateFields)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      BorrowTransaction.countDocuments(filter),
    ]);

    return {
      transactions: transactions.map((t) => sanitizeTransaction(t)),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  markOverdueTransactions: async (): Promise<number> => {
    const { syncOverdueFines } = await import('./fine.service');
    return syncOverdueFines();
  },

  sendDueDateReminders: async (): Promise<number> => {
    const settings = await getSystemSettings();
    const reminderDays = [3, 1];
    let sent = 0;

    for (const daysBefore of reminderDays) {
      const target = addDays(new Date(), daysBefore);
      const start = new Date(target);
      start.setHours(0, 0, 0, 0);
      const end = new Date(target);
      end.setHours(23, 59, 59, 999);

      const transactions = await BorrowTransaction.find({
        status: { $in: ['borrowed', 'overdue'] },
        dueDate: { $gte: start, $lte: end },
      }).populate('student book');

      for (const txn of transactions) {
        const student = txn.student as unknown as InstanceType<typeof User>;
        const book = txn.book as unknown as InstanceType<typeof Book>;
        if (!student?.email || !book?.title) continue;

        await sendDueDateReminderEmail(student.email, student.fullName, book.title, txn.dueDate);
        await createNotification({
          recipientId: student._id.toString(),
          type: 'due_date_reminder',
          title: 'Due Date Reminder',
          message: `"${book.title}" is due on ${txn.dueDate.toLocaleDateString()}`,
          entityType: 'BorrowTransaction',
          entityId: txn._id.toString(),
        });
        sent++;
      }
    }

    return sent;
  },

  sendOverdueNotices: async (): Promise<number> => {
    const transactions = await BorrowTransaction.find({ status: 'overdue' }).populate(
      'student book'
    );

    let sent = 0;
    for (const txn of transactions) {
      const student = txn.student as unknown as InstanceType<typeof User>;
      const book = txn.book as unknown as InstanceType<typeof Book>;
      if (!student?.email || !book?.title) continue;

      const overdueDays = daysBetween(txn.dueDate, new Date());
      await sendOverdueNoticeEmail(student.email, student.fullName, book.title, overdueDays);
      await createNotification({
        recipientId: student._id.toString(),
        type: 'fine_alert',
        title: 'Overdue Book',
        message: `"${book.title}" is ${overdueDays} day(s) overdue`,
        entityType: 'BorrowTransaction',
        entityId: txn._id.toString(),
      });
      sent++;
    }

    return sent;
  },
};
