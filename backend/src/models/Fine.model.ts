import mongoose, { Document, Schema } from 'mongoose';

export type FinePaymentStatus = 'pending' | 'paid' | 'waived';

export interface IFine extends Document {
  fineId: string;
  transaction: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  overdueDays: number;
  amount: number;
  ratePerDay: number;
  paymentStatus: FinePaymentStatus;
  paymentDate?: Date;
  waivedBy?: mongoose.Types.ObjectId;
  waivedReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fineSchema = new Schema<IFine>(
  {
    fineId: { type: String, required: true, unique: true },
    transaction: { type: Schema.Types.ObjectId, ref: 'BorrowTransaction', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    overdueDays: { type: Number, required: true },
    amount: { type: Number, required: true },
    ratePerDay: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'waived'],
      default: 'pending',
    },
    paymentDate: { type: Date },
    waivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    waivedReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

fineSchema.index({ student: 1, paymentStatus: 1 });
fineSchema.index({ transaction: 1 });

export const Fine = mongoose.model<IFine>('Fine', fineSchema);
