import mongoose, { Document, Schema } from 'mongoose';

export type ReservationStatus = 'active' | 'expired' | 'cancelled' | 'completed';

export interface IReservation extends Document {
  reservationId: string;
  student: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  reservationDate: Date;
  expiryDate: Date;
  status: ReservationStatus;
  cancelledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    reservationId: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    reservationDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'completed'],
      default: 'active',
    },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

reservationSchema.index({ student: 1, status: 1 });
reservationSchema.index({ book: 1, status: 1 });
reservationSchema.index({ expiryDate: 1, status: 1 });

export const Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);
