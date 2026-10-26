import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { Fine } from '../models/Fine.model';
import { BorrowTransaction } from '../models/BorrowTransaction.model';
import { getSystemSettings } from '../models/SystemSettings.model';
import { sendAccountStatusEmail } from './email.service';
import { createNotification } from './notification.service';
import { createAuditLog } from './audit.service';
import { AuthRequest } from '../types/express.d';

export const getOutstandingFineTotal = async (studentId: string): Promise<number> => {
  const result = await Fine.aggregate([
    { $match: { student: new mongoose.Types.ObjectId(studentId), paymentStatus: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

export const getOverdueReturnCount = async (studentId: string): Promise<number> => {
  return BorrowTransaction.countDocuments({
    student: studentId,
    status: 'returned',
    fineAmount: { $gt: 0 },
  });
};

export const evaluateAutoBlock = async (
  studentId: string,
  req?: AuthRequest
): Promise<{ blocked: boolean; reason?: string }> => {
  const settings = await getSystemSettings();
  const { blockRules } = settings;

  if (!blockRules.autoBlockEnabled) {
    return { blocked: false };
  }

  const student = await User.findOne({
    _id: studentId,
    role: 'student',
    deletedAt: { $exists: false },
  });

  if (!student || student.status === 'blocked') {
    return { blocked: false };
  }

  const outstandingTotal = await getOutstandingFineTotal(studentId);
  const overdueReturnCount = await getOverdueReturnCount(studentId);

  let reason: string | null = null;

  if (outstandingTotal >= blockRules.fineThreshold) {
    reason = `Outstanding fines (Rs. ${outstandingTotal}) exceed threshold of Rs. ${blockRules.fineThreshold}`;
  } else if (overdueReturnCount >= blockRules.maxOverdueReturns) {
    reason = `Exceeded maximum overdue returns (${overdueReturnCount}/${blockRules.maxOverdueReturns})`;
  }

  if (!reason) {
    return { blocked: false };
  }

  student.status = 'blocked';
  student.statusReason = reason;
  student.statusUpdatedBy = req?.user?.id
    ? new mongoose.Types.ObjectId(req.user.id)
    : undefined;
  student.statusUpdatedAt = new Date();
  await student.save();

  await sendAccountStatusEmail(student.email, student.fullName, 'blocked', reason);
  await createNotification({
    recipientId: studentId,
    type: 'account_status_change',
    title: 'Account Blocked',
    message: reason,
    entityType: 'User',
    entityId: studentId,
  });

  if (req) {
    await createAuditLog(req, 'student.auto_block', 'User', studentId, { reason });
  }

  return { blocked: true, reason };
};
