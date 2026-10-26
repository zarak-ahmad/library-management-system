import mongoose from 'mongoose';
import { getSystemSettings } from '../models/SystemSettings.model';
import { createAuditLog } from './audit.service';
import { AuthRequest } from '../types/express.d';
import {
  UpdateFineRulesInput,
  UpdateBlockRulesInput,
  UpdateBorrowRulesInput,
} from '../validators/settings.validator';

const sanitizeSettings = (settings: Awaited<ReturnType<typeof getSystemSettings>>) => ({
  borrowRules: settings.borrowRules,
  fineRules: settings.fineRules,
  blockRules: settings.blockRules,
  updatedAt: settings.updatedAt,
});

export const settingsService = {
  get: async () => {
    const settings = await getSystemSettings();
    return sanitizeSettings(settings);
  },

  updateFineRules: async (input: UpdateFineRulesInput, req: AuthRequest) => {
    const settings = await getSystemSettings();

    if (input.ratePerDay !== undefined) settings.fineRules.ratePerDay = input.ratePerDay;
    if (input.currency !== undefined) settings.fineRules.currency = input.currency;
    if (input.gracePeriodDays !== undefined) {
      settings.fineRules.gracePeriodDays = input.gracePeriodDays;
    }

    settings.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    await settings.save();

    await createAuditLog(req, 'settings.update_fine_rules', 'SystemSettings', settings._id.toString(), input);

    return sanitizeSettings(settings);
  },

  updateBlockRules: async (input: UpdateBlockRulesInput, req: AuthRequest) => {
    const settings = await getSystemSettings();

    if (input.fineThreshold !== undefined) settings.blockRules.fineThreshold = input.fineThreshold;
    if (input.maxOverdueReturns !== undefined) {
      settings.blockRules.maxOverdueReturns = input.maxOverdueReturns;
    }
    if (input.autoBlockEnabled !== undefined) {
      settings.blockRules.autoBlockEnabled = input.autoBlockEnabled;
    }

    settings.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    await settings.save();

    await createAuditLog(req, 'settings.update_block_rules', 'SystemSettings', settings._id.toString(), input);

    return sanitizeSettings(settings);
  },

  updateBorrowRules: async (input: UpdateBorrowRulesInput, req: AuthRequest) => {
    const settings = await getSystemSettings();

    if (input.borrowDurationDays !== undefined) {
      settings.borrowRules.borrowDurationDays = input.borrowDurationDays;
    }
    if (input.maxBooksPerStudent !== undefined) {
      settings.borrowRules.maxBooksPerStudent = input.maxBooksPerStudent;
    }
    if (input.reservationExpiryDays !== undefined) {
      settings.borrowRules.reservationExpiryDays = input.reservationExpiryDays;
    }

    settings.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    await settings.save();

    await createAuditLog(req, 'settings.update_borrow_rules', 'SystemSettings', settings._id.toString(), input);

    return sanitizeSettings(settings);
  },
};
