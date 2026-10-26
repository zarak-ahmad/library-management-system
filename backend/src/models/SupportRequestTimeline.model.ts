import mongoose, { Document, Schema } from 'mongoose';

export type TimelineAction =
  | 'created'
  | 'assigned'
  | 'comment'
  | 'status_changed'
  | 'resolved'
  | 'reopened';

export interface ISupportRequestTimeline extends Document {
  supportRequest: mongoose.Types.ObjectId;
  action: TimelineAction;
  performedBy: mongoose.Types.ObjectId;
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
  timestamp: Date;
}

const timelineSchema = new Schema<ISupportRequestTimeline>(
  {
    supportRequest: { type: Schema.Types.ObjectId, ref: 'SupportRequest', required: true },
    action: {
      type: String,
      enum: ['created', 'assigned', 'comment', 'status_changed', 'resolved', 'reopened'],
      required: true,
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    previousStatus: { type: String },
    newStatus: { type: String },
    notes: { type: String, maxlength: 2000 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

timelineSchema.index({ supportRequest: 1, timestamp: 1 });

export const SupportRequestTimeline = mongoose.model<ISupportRequestTimeline>(
  'SupportRequestTimeline',
  timelineSchema
);
