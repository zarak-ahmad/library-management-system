import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { Book } from '../models/Book.model';
import { BorrowTransaction } from '../models/BorrowTransaction.model';
import { getSystemSettings } from '../models/SystemSettings.model';
import { ApiError } from '../utils/ApiError';
import { syncBookStatus } from '../utils/book';

export const assertStudentCanBorrow = async (studentId: string): Promise<void> => {
  const student = await User.findOne({
    _id: studentId,
    role: 'student',
    deletedAt: { $exists: false },
  });

  if (!student) throw ApiError.notFound('Student not found');
  if (student.status === 'blocked' || student.status === 'suspended') {
    throw ApiError.forbidden(
      `Your account is ${student.status}. Borrowing actions are not allowed.`
    );
  }
  if (student.status !== 'active') {
    throw ApiError.forbidden('Your account is not active for borrowing.');
  }
};

export const assertWithinBorrowLimit = async (studentId: string): Promise<void> => {
  const settings = await getSystemSettings();
  const activeCount = await BorrowTransaction.countDocuments({
    student: studentId,
    status: { $in: ['borrowed', 'overdue'] },
  });

  if (activeCount >= settings.borrowRules.maxBooksPerStudent) {
    throw ApiError.badRequest(
      `Maximum borrow limit reached (${settings.borrowRules.maxBooksPerStudent} books)`
    );
  }
};

export const getAvailableBook = async (bookId: string, session?: mongoose.ClientSession) => {
  const bookQuery = Book.findOne({ _id: bookId, deletedAt: { $exists: false } });
  const book = session ? await bookQuery.session(session) : await bookQuery;

  if (!book) throw ApiError.notFound('Book not found');
  if (book.availableCopies <= 0) {
    throw ApiError.badRequest('No copies available for this book');
  }

  return book;
};

export const decrementAvailableCopy = (book: InstanceType<typeof Book>): void => {
  book.availableCopies -= 1;
  book.borrowedCopies += 1;
  syncBookStatus(book);
};

export const incrementAvailableOnReturn = (book: InstanceType<typeof Book>): void => {
  book.borrowedCopies = Math.max(0, book.borrowedCopies - 1);
  book.availableCopies += 1;
  syncBookStatus(book);
};

export const reserveCopy = (book: InstanceType<typeof Book>): void => {
  if (book.availableCopies <= 0) {
    throw ApiError.badRequest('No copies available to reserve');
  }
  book.availableCopies -= 1;
  book.reservedCopies += 1;
  syncBookStatus(book);
};

export const releaseReservedCopy = (book: InstanceType<typeof Book>): void => {
  book.reservedCopies = Math.max(0, book.reservedCopies - 1);
  book.availableCopies += 1;
  syncBookStatus(book);
};

export const completeReservationCopy = (book: InstanceType<typeof Book>): void => {
  book.reservedCopies = Math.max(0, book.reservedCopies - 1);
  book.borrowedCopies += 1;
  syncBookStatus(book);
};
