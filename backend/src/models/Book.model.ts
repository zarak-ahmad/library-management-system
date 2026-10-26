import mongoose, { Document, Schema } from 'mongoose';
import { BookStatus } from '../utils/book';

export interface IBookCover {
  url: string;
  publicId?: string;
}

export interface IBook extends Document {
  bookId: string;
  isbn: string;
  title: string;
  author: string;
  genre: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  publisher: string;
  edition?: string;
  publishedYear: number;
  language: string;
  description?: string;
  coverImage?: IBookCover;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  status: BookStatus;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookSchema = new Schema<IBook>(
  {
    bookId: { type: String, required: true, unique: true },
    isbn: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    genre: { type: Schema.Types.ObjectId, ref: 'Genre', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    publisher: { type: String, required: true, trim: true },
    edition: { type: String, trim: true },
    publishedYear: { type: Number, required: true },
    language: { type: String, required: true, trim: true, default: 'English' },
    description: { type: String, trim: true },
    coverImage: {
      url: { type: String },
      publicId: { type: String },
    },
    shelfLocation: { type: String, required: true, trim: true },
    totalCopies: { type: Number, required: true, min: 0, default: 1 },
    availableCopies: { type: Number, required: true, min: 0, default: 1 },
    borrowedCopies: { type: Number, default: 0, min: 0 },
    reservedCopies: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['available', 'reserved', 'borrowed', 'out_of_stock'],
      default: 'available',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });
bookSchema.index({ genre: 1 });
bookSchema.index({ category: 1 });
bookSchema.index({ status: 1 });

export const Book = mongoose.model<IBook>('Book', bookSchema);
