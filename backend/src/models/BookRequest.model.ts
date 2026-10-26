import mongoose, { Document, Schema } from 'mongoose';

export type BookRequestStatus =
  | 'pending_confirm'
  | 'pending'
  | 'confirmed'
  | 'canceled'
  | 'awaiting_confirmation'
  | 'approved'
  | 'rejected';

export interface IBookRequest extends Document {
  requestId: string;
  student: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  requestDate: Date;
  status: BookRequestStatus;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookRequestSchema = new Schema<IBookRequest>(
  {
    requestId: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    requestDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: [
        'pending_confirm',
        'pending',
        'confirmed',
        'canceled',
        'awaiting_confirmation',
        'approved',
        'rejected',
      ],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

bookRequestSchema.index({ student: 1, status: 1 });
bookRequestSchema.index({ status: 1, requestDate: -1 });
bookRequestSchema.index({ book: 1, status: 1 });

export const BookRequest = mongoose.model<IBookRequest>('BookRequest', bookRequestSchema);
