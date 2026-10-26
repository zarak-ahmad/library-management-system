import mongoose, { Document, Schema } from 'mongoose';

export interface IBlockRules {
  fineThreshold: number;
  maxOverdueReturns: number;
  autoBlockEnabled: boolean;
}

export interface IBorrowRules {
  borrowDurationDays: number;
  maxBooksPerStudent: number;
  reservationExpiryDays: number;
}

export interface IFineRules {
  ratePerDay: number;
  currency: string;
  gracePeriodDays: number;
}

export interface ISystemSettings extends Document {
  borrowRules: IBorrowRules;
  fineRules: IFineRules;
  blockRules: IBlockRules;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    borrowRules: {
      borrowDurationDays: { type: Number, default: 14 },
      maxBooksPerStudent: { type: Number, default: 3 },
      reservationExpiryDays: { type: Number, default: 3 },
    },
    fineRules: {
      ratePerDay: { type: Number, default: 50 },
      currency: { type: String, default: 'PKR' },
      gracePeriodDays: { type: Number, default: 0 },
    },
    blockRules: {
      fineThreshold: { type: Number, default: 500 },
      maxOverdueReturns: { type: Number, default: 3 },
      autoBlockEnabled: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const SystemSettings = mongoose.model<ISystemSettings>(
  'SystemSettings',
  systemSettingsSchema
);

export const getSystemSettings = async (): Promise<ISystemSettings> => {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }
  if (!settings.blockRules) {
    settings.blockRules = { fineThreshold: 500, maxOverdueReturns: 3, autoBlockEnabled: true };
    await settings.save();
  }
  return settings;
};
