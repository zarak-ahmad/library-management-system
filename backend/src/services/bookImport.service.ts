import mongoose from 'mongoose';
import { Book } from '../models/Book.model';
import { Genre } from '../models/Genre.model';
import { Category } from '../models/Category.model';
import { ApiError } from '../utils/ApiError';
import { generateBookId, syncBookStatus } from '../utils/book';
import { createAuditLog } from './audit.service';
import { AuthRequest } from '../types/express.d';
import { parseImportFile, ParsedBookRow, IMPORT_TEMPLATE_CSV } from '../utils/bookImportParser';

const MAX_IMPORT_ROWS = 500;

export interface ImportRowError {
  row: number;
  message: string;
}

export interface BookImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportRowError[];
}

const requiredFields = ['isbn', 'title', 'author', 'genre', 'category', 'publisher', 'shelfLocation'] as const;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const parseYear = (value: string | undefined): number => {
  const year = parseInt(value || '', 10);
  const currentYear = new Date().getFullYear();
  if (Number.isFinite(year) && year >= 1000 && year <= currentYear + 1) {
    return year;
  }
  return currentYear;
};

export const bookImportService = {
  getTemplate: () => IMPORT_TEMPLATE_CSV,

  importFromFile: async (file: Express.Multer.File, req: AuthRequest): Promise<BookImportResult> => {
    if (!file?.buffer) {
      throw ApiError.badRequest('Import file is required');
    }

    let rows: ParsedBookRow[];
    try {
      rows = await parseImportFile(file.buffer, file.originalname, file.mimetype);
    } catch (error) {
      throw ApiError.badRequest(error instanceof Error ? error.message : 'Failed to parse import file');
    }

    if (rows.length === 0) {
      throw ApiError.badRequest('No book rows found in the uploaded file');
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      throw ApiError.badRequest(`Import limit is ${MAX_IMPORT_ROWS} books per file`);
    }

    const [genres, categories] = await Promise.all([
      Genre.find({ isActive: true }),
      Category.find({ isActive: true }),
    ]);

    const genreMap = new Map(genres.map((g) => [g.name.trim().toLowerCase(), g._id]));
    const categoryMap = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c._id]));

    const seenIsbns = new Set<string>();
    const result: BookImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const row of rows) {
      const missing = requiredFields.filter((field) => !row.values[field]?.trim());
      if (missing.length > 0) {
        result.failed++;
        result.errors.push({
          row: row.rowNumber,
          message: `Missing required field(s): ${missing.join(', ')}`,
        });
        continue;
      }

      const isbn = row.values.isbn.trim();
      const isbnKey = isbn.toLowerCase();

      if (seenIsbns.has(isbnKey)) {
        result.skipped++;
        result.errors.push({ row: row.rowNumber, message: `Duplicate ISBN in file: ${isbn}` });
        continue;
      }
      seenIsbns.add(isbnKey);

      const genreId = genreMap.get(row.values.genre.trim().toLowerCase());
      if (!genreId) {
        result.failed++;
        result.errors.push({
          row: row.rowNumber,
          message: `Genre not found: "${row.values.genre}". Create it in Catalog first.`,
        });
        continue;
      }

      const categoryId = categoryMap.get(row.values.category.trim().toLowerCase());
      if (!categoryId) {
        result.failed++;
        result.errors.push({
          row: row.rowNumber,
          message: `Category not found: "${row.values.category}". Create it in Catalog first.`,
        });
        continue;
      }

      const existingIsbn = await Book.findOne({ isbn, deletedAt: { $exists: false } });
      if (existingIsbn) {
        result.skipped++;
        result.errors.push({ row: row.rowNumber, message: `ISBN already exists: ${isbn}` });
        continue;
      }

      try {
        const totalCopies = Math.max(1, parsePositiveInt(row.values.totalCopies, 1));
        const bookId = await generateBookId();

        const book = await Book.create({
          bookId,
          isbn,
          title: row.values.title.trim(),
          author: row.values.author.trim(),
          genre: genreId,
          category: categoryId,
          publisher: row.values.publisher.trim(),
          edition: row.values.edition?.trim() || undefined,
          publishedYear: parseYear(row.values.publishedYear),
          language: row.values.language?.trim() || 'English',
          description: row.values.description?.trim() || undefined,
          shelfLocation: row.values.shelfLocation.trim(),
          totalCopies,
          availableCopies: totalCopies,
          borrowedCopies: 0,
          reservedCopies: 0,
          status: 'available',
          createdBy: new mongoose.Types.ObjectId(req.user.id),
        });

        syncBookStatus(book);
        await book.save();
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: row.rowNumber,
          message: error instanceof Error ? error.message : 'Failed to import row',
        });
      }
    }

    if (result.imported > 0) {
      await createAuditLog(req, 'book.import', 'Book', undefined, {
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
        filename: file.originalname,
      });
    }

    return result;
  },
};
