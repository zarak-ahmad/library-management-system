import mongoose, { FilterQuery } from 'mongoose';
import { BookRequest, IBookRequest } from '../models/BookRequest.model';
import { Book } from '../models/Book.model';
import { User } from '../models/User.model';
import { BorrowTransaction } from '../models/BorrowTransaction.model';
import { ApiError } from '../utils/ApiError';
import {
  assertStudentCanBorrow,
  assertWithinBorrowLimit,
} from '../utils/borrowHelpers';
import { createAuditLog } from './audit.service';
import { sendBookRejectedEmail } from './email.service';
import { createNotification } from './notification.service';
import { whatsappConfirmationService } from './whatsappConfirmation.service';
import { sendBookApprovedWhatsApp } from './whatsapp.service';
import { issueBookToStudent } from './borrow.service';
import {
  ACTIVE_BOOK_REQUEST_STATUSES,
  AWAITING_STUDENT_POLL_STATUSES,
  cancelPendingConfirmationsForRequest,
  reconcileActiveBookRequests,
} from './bookRequestLifecycle.service';
import { generateSequentialId } from '../utils/generateId';
import { env } from '../config/env';
import { AuthRequest } from '../types/express.d';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import {
  CreateBookRequestInput,
  ListBookRequestsQuery,
  ProcessBookRequestInput,
} from '../validators/borrow.validator';

const populateFields = [
  { path: 'student', select: 'fullName email phone studentProfile status' },
  { path: 'book', select: 'title author bookId isbn availableCopies coverImage' },
  { path: 'approvedBy', select: 'fullName' },
  { path: 'rejectedBy', select: 'fullName' },
];

const ACTIVE_REQUEST_STATUSES = ACTIVE_BOOK_REQUEST_STATUSES;

const findActiveBookRequest = async (studentId: string, bookId: string) => {
  await reconcileActiveBookRequests({ studentId, bookId });

  const existing = await BookRequest.findOne({
    student: studentId,
    book: bookId,
    status: { $in: ACTIVE_REQUEST_STATUSES },
  });

  return existing;
};

const sanitizeRequest = (item: any) => {
  const obj = item.toObject ? item.toObject({ virtuals: true }) : item;
  return {
    id: obj._id?.toString(),
    requestId: obj.requestId,
    student: obj.student,
    book: obj.book,
    requestDate: obj.requestDate,
    status: obj.status,
    approvedBy: obj.approvedBy,
    rejectedBy: obj.rejectedBy,
    remarks: obj.remarks,
    processedAt: obj.processedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

export const bookRequestService = {
  list: async (query: ListBookRequestsQuery, req: AuthRequest) => {
    if (env.WASENDER_API_KEY) {
      await whatsappConfirmationService.syncPendingPollVotesFromWasender();
    }

    if (req.user.role !== 'student') {
      await reconcileActiveBookRequests();
    }

    const { skip, limit, page, sort } = parsePagination(query);
    const filter: FilterQuery<IBookRequest> = {};

    if (req.user.role === 'student') {
      filter.student = req.user.id;
      await reconcileActiveBookRequests({ studentId: req.user.id });
    } else if (query.studentId) {
      filter.student = query.studentId;
    }

    if (query.status === 'active') {
      filter.status = { $in: ACTIVE_REQUEST_STATUSES };
    } else if (query.status === 'pending' || query.status === 'pending_confirm') {
      filter.status = { $in: [...AWAITING_STUDENT_POLL_STATUSES] };
    } else if (query.status === 'confirmed') {
      filter.status = 'confirmed';
    } else if (query.status) {
      filter.status = query.status;
    }
    if (query.bookId) filter.book = query.bookId;

    const [requests, total] = await Promise.all([
      BookRequest.find(filter).populate(populateFields).sort(sort).skip(skip).limit(limit),
      BookRequest.countDocuments(filter),
    ]);

    return {
      requests: requests.map((r) => sanitizeRequest(r)),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  create: async (input: CreateBookRequestInput, req: AuthRequest) => {
    await assertStudentCanBorrow(req.user.id);
    await assertWithinBorrowLimit(req.user.id);

    const student = await User.findById(req.user.id);
    if (!student) throw ApiError.notFound('Student not found');

    if (!student.phone?.trim()) {
      throw ApiError.badRequest(
        'Add a phone number to your profile to confirm book requests via WhatsApp'
      );
    }

    const book = await Book.findOne({ _id: input.bookId, deletedAt: { $exists: false } });
    if (!book) throw ApiError.notFound('Book not found');

    const existingRequest = await findActiveBookRequest(req.user.id, input.bookId);

    if (
      existingRequest &&
      (AWAITING_STUDENT_POLL_STATUSES as readonly string[]).includes(existingRequest.status)
    ) {
      const confirmation = await whatsappConfirmationService.sendBookRequestConfirmation(
        req.user.id,
        input.bookId,
        student.phone,
        existingRequest._id.toString(),
        { forceResend: true }
      );

      return {
        confirmationSent: true,
        resent: true,
        confirmationToken: confirmation.confirmationToken,
        expiresAt: confirmation.expiresAt,
        message: 'WhatsApp confirmation link resent. Tap Confirm or Cancel in the message.',
        bookRequestId: existingRequest._id.toString(),
        requestId: existingRequest.requestId,
        book: {
          id: book._id.toString(),
          title: book.title,
          author: book.author,
        },
      };
    }

    if (existingRequest?.status === 'confirmed') {
      throw ApiError.conflict(
        'This request is already confirmed and waiting for librarian approval.'
      );
    }

    if (existingRequest?.status === 'awaiting_confirmation') {
      throw ApiError.conflict(
        'This request is waiting for librarian approval. Please contact the library if you need help.'
      );
    }

    if (existingRequest) {
      throw ApiError.conflict('You already have an active request for this book');
    }

    const requestId = await generateSequentialId('REQ', BookRequest, 'requestId');
    const bookRequest = await BookRequest.create({
      requestId,
      student: req.user.id,
      book: input.bookId,
      requestDate: new Date(),
      status: 'pending',
    });

    let confirmation;
    try {
      confirmation = await whatsappConfirmationService.sendBookRequestConfirmation(
        req.user.id,
        input.bookId,
        student.phone,
        bookRequest._id.toString()
      );
    } catch (error) {
      await BookRequest.findByIdAndDelete(bookRequest._id);
      throw error;
    }

    await createAuditLog(req, 'book_request.whatsapp_sent', 'BookRequest', bookRequest._id.toString());

    return {
      confirmationSent: true,
      confirmationToken: confirmation.confirmationToken,
      expiresAt: confirmation.expiresAt,
      message: confirmation.message,
      bookRequestId: bookRequest._id.toString(),
      requestId: bookRequest.requestId,
      book: {
        id: book._id.toString(),
        title: book.title,
        author: book.author,
      },
    };
  },

  approve: async (id: string, input: ProcessBookRequestInput, req: AuthRequest) => {
    const bookRequest = await BookRequest.findOne({
      _id: id,
      status: 'confirmed',
    });
    if (!bookRequest) throw ApiError.notFound('Pending book request not found');

    await cancelPendingConfirmationsForRequest(bookRequest._id.toString());

    const transaction = await issueBookToStudent(
      {
        studentId: bookRequest.student.toString(),
        bookId: bookRequest.book.toString(),
        issuedBy: req.user.id,
        bookRequestId: bookRequest._id.toString(),
      },
      req
    );

    bookRequest.status = 'approved';
    bookRequest.approvedBy = new mongoose.Types.ObjectId(req.user.id);
    bookRequest.remarks = input.remarks;
    bookRequest.processedAt = new Date();
    await bookRequest.save();

    const [student, book] = await Promise.all([
      User.findById(bookRequest.student),
      Book.findById(bookRequest.book),
    ]);

    if (student?.phone && book) {
      await sendBookApprovedWhatsApp({
        phone: student.phone,
        fullName: student.fullName,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookId: book.bookId,
        transactionId: transaction.transactionId,
        issueDate: new Date(transaction.issueDate),
        dueDate: new Date(transaction.dueDate),
      });
    }

    await createAuditLog(req, 'book_request.approve', 'BookRequest', bookRequest._id.toString());

    const populated = await BookRequest.findById(bookRequest._id).populate(populateFields);
    return {
      confirmationSent: false,
      message: 'Book request approved and issued to the student.',
      transactionId: transaction.transactionId,
      transaction,
      request: sanitizeRequest(populated!),
    };
  },

  reject: async (id: string, input: ProcessBookRequestInput, req: AuthRequest) => {
    const bookRequest = await BookRequest.findOne({
      _id: id,
      status: {
        $in: [...AWAITING_STUDENT_POLL_STATUSES, 'confirmed', 'awaiting_confirmation'],
      },
    }).populate('book student');
    if (!bookRequest) throw ApiError.notFound('Pending book request not found');

    await cancelPendingConfirmationsForRequest(bookRequest._id.toString());

    bookRequest.status = 'rejected';
    bookRequest.rejectedBy = new mongoose.Types.ObjectId(req.user.id);
    bookRequest.remarks = input.remarks?.trim() || 'Rejected by library staff';
    bookRequest.processedAt = new Date();
    await bookRequest.save();

    const student = bookRequest.student as unknown as InstanceType<typeof User>;
    const book = bookRequest.book as unknown as InstanceType<typeof Book>;

    if (student?.email && book?.title) {
      await sendBookRejectedEmail(student.email, student.fullName, book.title, input.remarks);
      await createNotification({
        recipientId: student._id.toString(),
        type: 'book_rejected',
        title: 'Book Request Rejected',
        message: `Your request for "${book.title}" was rejected`,
        entityType: 'BookRequest',
        entityId: bookRequest._id.toString(),
      });
    }

    await createAuditLog(req, 'book_request.reject', 'BookRequest', bookRequest._id.toString());

    const populated = await BookRequest.findById(bookRequest._id).populate(populateFields);
    return sanitizeRequest(populated!);
  },

  cancel: async (id: string, req: AuthRequest) => {
    const bookRequest = await BookRequest.findOne({
      _id: id,
      student: req.user.id,
      status: { $in: ACTIVE_REQUEST_STATUSES },
    }).populate('book');

    if (!bookRequest) {
      throw ApiError.notFound('Active book request not found');
    }

    await cancelPendingConfirmationsForRequest(bookRequest._id.toString());

    bookRequest.status = 'rejected';
    bookRequest.remarks = 'Cancelled by student';
    bookRequest.processedAt = new Date();
    await bookRequest.save();

    await createAuditLog(req, 'book_request.cancel', 'BookRequest', bookRequest._id.toString());

    const populated = await BookRequest.findById(bookRequest._id).populate(populateFields);
    return sanitizeRequest(populated!);
  },

  remove: async (id: string, req: AuthRequest) => {
    const bookRequest = await BookRequest.findById(id).populate('book student');
    if (!bookRequest) {
      throw ApiError.notFound('Book request not found');
    }

    const activeBorrow = await BorrowTransaction.findOne({
      bookRequest: bookRequest._id,
      status: { $in: ['borrowed', 'overdue'] },
    });
    if (activeBorrow) {
      throw ApiError.badRequest(
        'Cannot delete this request while the book is still on loan to the student'
      );
    }

    await cancelPendingConfirmationsForRequest(bookRequest._id.toString());

    await BookRequest.findByIdAndDelete(bookRequest._id);

    await createAuditLog(req, 'book_request.delete', 'BookRequest', bookRequest._id.toString(), {
      requestId: bookRequest.requestId,
      status: bookRequest.status,
    });

    return {
      id: bookRequest._id.toString(),
      requestId: bookRequest.requestId,
      deleted: true,
    };
  },
};
