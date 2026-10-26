import { Book } from '../models/Book.model';

export const generateBookId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `BK-${year}-`;
  const latest = await Book.findOne({ bookId: new RegExp(`^${prefix}`) })
    .sort({ bookId: -1 })
    .select('bookId');

  let next = 1;
  if (latest?.bookId) {
    const num = parseInt(latest.bookId.split('-').pop() || '0', 10);
    next = num + 1;
  }

  return `${prefix}${String(next).padStart(5, '0')}`;
};

export type BookStatus = 'available' | 'reserved' | 'borrowed' | 'out_of_stock';

export const computeBookStatus = (book: {
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  totalCopies: number;
}): BookStatus => {
  if (book.availableCopies > 0) return 'available';
  if (book.totalCopies === 0) return 'out_of_stock';
  if (book.reservedCopies > 0) return 'reserved';
  if (book.borrowedCopies > 0) return 'borrowed';
  return 'out_of_stock';
};

export const syncBookStatus = (book: {
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  totalCopies: number;
  status: BookStatus;
}): void => {
  book.status = computeBookStatus(book);
};
