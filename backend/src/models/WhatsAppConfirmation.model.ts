import mongoose, { Document, Schema } from 'mongoose';

export type WhatsAppConfirmationType = 'book_request' | 'book_issue';
export type WhatsAppConfirmationStatus = 'pending' | 'confirmed' | 'declined' | 'expired';

export interface IWhatsAppConfirmation extends Document {
  token: string;
  type: WhatsAppConfirmationType;
  student: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  bookRequest?: mongoose.Types.ObjectId;
  initiatedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  phone: string;
  status: WhatsAppConfirmationStatus;
  whatsappJid?: string;
  wasenderMsgId?: string;
  wasenderPollKeyId?: string;
  expiresAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppConfirmationSchema = new Schema<IWhatsAppConfirmation>(
  {
    token: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['book_request', 'book_issue'], required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    bookRequest: { type: Schema.Types.ObjectId, ref: 'BookRequest' },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
    phone: { type: String, required: true },
    whatsappJid: { type: String, trim: true },
    wasenderMsgId: { type: String, trim: true, index: true },
    wasenderPollKeyId: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'declined', 'expired'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

whatsAppConfirmationSchema.index({ student: 1, book: 1, type: 1, status: 1 });

export const WhatsAppConfirmation = mongoose.model<IWhatsAppConfirmation>(
  'WhatsAppConfirmation',
  whatsAppConfirmationSchema
);
