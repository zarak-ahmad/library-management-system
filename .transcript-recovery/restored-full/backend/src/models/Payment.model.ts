import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  paymentId: string;
  fine: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  originalAmount: number;
  discount: number;
  amount: number;
  paymentMethod: 'cash' | 'online' | 'waived';
  collectedBy: mongoose.Types.ObjectId;
  receiptNumber?: string;
  notes?: string;
  paidAt: Date;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true },
    fine: { type: Schema.Types.ObjectId, ref: 'Fine', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalAmount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online', 'waived'],
      default: 'cash',
    },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiptNumber: { type: String },
    notes: { type: String },
    paidAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ student: 1, createdAt: -1 });
paymentSchema.index({ fine: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
