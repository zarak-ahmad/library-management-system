import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mongoose, { FilterQuery } from 'mongoose';
import { Book, IBook } from '../models/Book.model';
import { Genre } from '../models/Genre.model';
import { Category } from '../models/Category.model';
import { ApiError } from '../utils/ApiError';
import { generateBookId, syncBookStatus } from '../utils/book';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { createAuditLog } from './audit.service';
import { AuthRequest } from '../types/express.d';
import {
  AdjustCopiesInput,
  CreateBookInput,
  ListBooksQuery,
  UpdateBookInput,
} from '../validators/book.validator';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'books');

const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

const sanitizeBook = (book: IBook & { genre?: unknown; category?: unknown }) => {
  const obj = book.toObject ? book.toObject({ virtuals: true }) : book;
  return {
    id: obj._id?.toString() || obj.id,
    bookId: obj.bookId,
    isbn: obj.isbn,
    title: obj.title,
    author: obj.author,
    genre: obj.genre,
    category: obj.category,
    publisher: obj.publisher,
    edition: obj.edition,
    publishedYear: obj.publishedYear,
    language: obj.language,
    description: obj.description,
    coverImage: obj.coverImage,
    shelfLocation: obj.shelfLocation,
    totalCopies: obj.totalCopies,
    availableCopies: obj.availableCopies,
    borrowedCopies: obj.borrowedCopies,
    reservedCopies: obj.reservedCopies,
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const buildBookFilter = (query: ListBooksQuery): FilterQuery<IBook> => {
  const filter: FilterQuery<IBook> = { deletedAt: { $exists: false } };

  if (query.genre) filter.genre = query.genre;
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [{ title: regex }, { author: regex }, { isbn: regex }, { bookId: regex }];
  }

  return filter;
};

const validateGenreCategory = async (genreId: string, categoryId: string) => {
  const [genre, category] = await Promise.all([
    Genre.findOne({ _id: genreId, isActive: true }),
    Category.findOne({ _id: categoryId, isActive: true }),
  ]);

  if (!genre) throw ApiError.badRequest('Invalid or inactive genre');
  if (!category) throw ApiError.badRequest('Invalid or inactive category');
};

const handleCoverUpload = async (
  file?: Express.Multer.File
): Promise<{ url: string; publicId?: string } | undefined> => {
  if (!file) return undefined;

  if (isCloudinaryConfigured) {
    const result = await uploadToCloudinary(file.buffer);
    return result;
  }

  ensureUploadDir();
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, file.buffer);
  return { url: `/uploads/books/${filename}` };
};

const removeCoverImage = async (coverImage?: { url?: string; publicId?: string } | null) => {
  if (!coverImage) return;

  if (coverImage.publicId && isCloudinaryConfigured) {
    await deleteFromCloudinary(coverImage.publicId);
    return;
  }

  if (coverImage.url?.startsWith('/uploads/')) {
    const filepath = path.join(process.cwd(), coverImage.url);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
};

export const bookService = {
  async list(query: ListBooksQuery) {
    const { skip, limit, page, sort } = parsePagination(query);
    const filter = buildBookFilter(query);

    const [books, total] = await Promise.all([
      Book.find(filter)
        .populate('genre', 'name')
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Book.countDocuments(filter),
    ]);

    return {
      books: books.map((b) => sanitizeBook(b)),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  async getById(id: string) {
    const book = await Book.findOne({ _id: id, deletedAt: { $exists: false } })
      .populate('genre', 'name description')
      .populate('category', 'name description');

    if (!book) throw ApiError.notFound('Book not found');
    return sanitizeBook(book);
  },

  async create(input: CreateBookInput, req: AuthRequest, file?: Express.Multer.File) {
    await validateGenreCategory(input.genreId, input.categoryId);

    const existingIsbn = await Book.findOne({ isbn: input.isbn, deletedAt: { $exists: false } });
    if (existingIsbn) throw ApiError.conflict('ISBN already exists');

    const coverImage = await handleCoverUpload(file);
    const bookId = await generateBookId();
    const totalCopies = input.totalCopies;

    const book = await Book.create({
      bookId,
      isbn: input.isbn,
      title: input.title,
      author: input.author,
      genre: input.genreId,
      category: input.categoryId,
      publisher: input.publisher,
      edition: input.edition,
      publishedYear: input.publishedYear,
      language: input.language || 'English',
      description: input.description,
      coverImage,
      shelfLocation: input.shelfLocation,
      totalCopies,
      availableCopies: totalCopies,
      borrowedCopies: 0,
      reservedCopies: 0,
      status: 'available',
      createdBy: req.user.id,
    });

    syncBookStatus(book);
    await book.save();

    await createAuditLog(req, 'book.create', 'Book', book._id.toString(), { bookId });

    const populated = await Book.findById(book._id)
      .populate('genre', 'name')
      .populate('category', 'name');

    return sanitizeBook(populated!);
  },

  async update(
    id: string,
    input: UpdateBookInput,
    req: AuthRequest,
    file?: Express.Multer.File
  ) {
    const book = await Book.findOne({ _id: id, deletedAt: { $exists: false } });
    if (!book) throw ApiError.notFound('Book not found');

    if (input.genreId || input.categoryId) {
      await validateGenreCategory(
        input.genreId || book.genre.toString(),
        input.categoryId || book.category.toString()
      );
    }

    if (input.isbn && input.isbn !== book.isbn) {
      const existing = await Book.findOne({ isbn: input.isbn, deletedAt: { $exists: false } });
      if (existing) throw ApiError.conflict('ISBN already exists');
      book.isbn = input.isbn;
    }

    if (input.title) book.title = input.title;
    if (input.author) book.author = input.author;
    if (input.genreId) book.genre = new mongoose.Types.ObjectId(input.genreId);
    if (input.categoryId) book.category = new mongoose.Types.ObjectId(input.categoryId);
    if (input.publisher) book.publisher = input.publisher;
    if (input.edition !== undefined) book.edition = input.edition;
    if (input.publishedYear) book.publishedYear = input.publishedYear;
    if (input.language) book.language = input.language;
    if (input.description !== undefined) book.description = input.description;
    if (input.shelfLocation) book.shelfLocation = input.shelfLocation;

    if (input.totalCopies !== undefined) {
      const diff = input.totalCopies - book.totalCopies;
      book.totalCopies = input.totalCopies;
      book.availableCopies = Math.max(0, book.availableCopies + diff);
    }

    if (file) {
      const existingCover = book.coverImage
        ? { url: book.coverImage.url, publicId: book.coverImage.publicId }
        : undefined;
      await removeCoverImage(existingCover);
      book.coverImage = await handleCoverUpload(file);
    }

    book.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    syncBookStatus(book);
    await book.save();

    await createAuditLog(req, 'book.update', 'Book', book._id.toString());

    const populated = await Book.findById(book._id)
      .populate('genre', 'name')
      .populate('category', 'name');

    return sanitizeBook(populated!);
  },

  async adjustCopies(id: string, input: AdjustCopiesInput, req: AuthRequest) {
    const book = await Book.findOne({ _id: id, deletedAt: { $exists: false } });
    if (!book) throw ApiError.notFound('Book not found');

    const inUse = book.borrowedCopies + book.reservedCopies;
    if (input.totalCopies < inUse) {
      throw ApiError.badRequest(
        `Cannot set total copies below ${inUse} (${book.borrowedCopies} borrowed, ${book.reservedCopies} reserved)`
      );
    }

    const diff = input.totalCopies - book.totalCopies;
    book.totalCopies = input.totalCopies;
    book.availableCopies = Math.max(0, book.availableCopies + diff);
    book.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    syncBookStatus(book);
    await book.save();

    await createAuditLog(req, 'book.adjust_copies', 'Book', book._id.toString(), {
      totalCopies: input.totalCopies,
    });

    return sanitizeBook(book);
  },

  async softDelete(id: string, req: AuthRequest) {
    const book = await Book.findOne({ _id: id, deletedAt: { $exists: false } });
    if (!book) throw ApiError.notFound('Book not found');

    if (book.borrowedCopies > 0 || book.reservedCopies > 0) {
      throw ApiError.badRequest('Cannot delete book with active borrows or reservations');
    }

    book.deletedAt = new Date();
    book.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    await book.save();

    await createAuditLog(req, 'book.delete', 'Book', book._id.toString());

    return { message: 'Book deleted successfully' };
  },
};
