import mongoose, { Document, Schema } from 'mongoose';

export type SupportCategory =
  | 'account_blocked'
  | 'fine_appeal'
  | 'reactivation_request'
  | 'incorrect_fine'
  | 'borrowing_restriction_appeal'
  | 'lost_book'
  | 'profile_correction'
  | 'general_inquiry';

export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SupportStatus =
  | 'open'
  | 'under_review'
  | 'waiting_for_student'
  | 'resolved'
  | 'rejected';

export interface ISupportAttachment {
  url: string;
  publicId?: string;
  filename: string;
}

export interface ISupportRequest extends Document {
  requestId: string;
  student: mongoose.Types.ObjectId;
  subject: string;
  category: SupportCategory;
  description: string;
  attachment?: ISupportAttachment;
  priority: SupportPriority;
  status: SupportStatus;
  assignedTo?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolutionNotes?: string;
  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportRequestSchema = new Schema<ISupportRequest>(
  {
    requestId: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: [
        'account_blocked',
        'fine_appeal',
        'reactivation_request',
        'incorrect_fine',
        'borrowing_restriction_appeal',
        'lost_book',
        'profile_correction',
        'general_inquiry',
      ],
      required: true,
    },
    description: { type: String, required: true, maxlength: 5000 },
    attachment: {
      url: { type: String },
      publicId: { type: String },
      filename: { type: String },
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'waiting_for_student', 'resolved', 'rejected'],
      default: 'open',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String, maxlength: 2000 },
    submittedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

supportRequestSchema.index({ student: 1, status: 1 });
supportRequestSchema.index({ status: 1, priority: 1, submittedDate: -1 });
supportRequestSchema.index({ assignedTo: 1, status: 1 });

export const SupportRequest = mongoose.model<ISupportRequest>(
  'SupportRequest',
  supportRequestSchema
);
