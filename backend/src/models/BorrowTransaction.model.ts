import mongoose, { Document, Schema } from 'mongoose';

export type BorrowStatus = 'borrowed' | 'returned' | 'overdue';
export type FinePaidStatus = 'none' | 'pending' | 'paid' | 'waived';

export interface IBorrowTransaction extends Document {
  transactionId: string;
  student: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;
  issueDate: Date;
  dueDate: Date;
  returnDate?: Date;
  returnedTo?: mongoose.Types.ObjectId;
  status: BorrowStatus;
  fineAmount: number;
  finePaidStatus: FinePaidStatus;
  bookRequest?: mongoose.Types.ObjectId;
  reservation?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const borrowTransactionSchema = new Schema<IBorrowTransaction>(
  {
    transactionId: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date },
    returnedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['borrowed', 'returned', 'overdue'],
      default: 'borrowed',
    },
    fineAmount: { type: Number, default: 0 },
    finePaidStatus: {
      type: String,
      enum: ['none', 'pending', 'paid', 'waived'],
      default: 'none',
    },
    bookRequest: { type: Schema.Types.ObjectId, ref: 'BookRequest' },
    reservation: { type: Schema.Types.ObjectId, ref: 'Reservation' },
  },
  { timestamps: true }
);

borrowTransactionSchema.index({ student: 1, status: 1 });
borrowTransactionSchema.index({ dueDate: 1, status: 1 });
borrowTransactionSchema.index({ book: 1 });

export const BorrowTransaction = mongoose.model<IBorrowTransaction>(
  'BorrowTransaction',
  borrowTransactionSchema
);
