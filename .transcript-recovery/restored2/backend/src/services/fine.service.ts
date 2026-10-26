import mongoose, { FilterQuery } from 'mongoose';
import { Fine, IFine } from '../models/Fine.model';
import { Payment } from '../models/Payment.model';
import { BorrowTransaction, IBorrowTransaction } from '../models/BorrowTransaction.model';
import { User } from '../models/User.model';
import { getSystemSettings } from '../models/SystemSettings.model';
import { ApiError } from '../utils/ApiError';
import { generateSequentialId, daysBetween } from '../utils/generateId';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { createAuditLog } from './audit.service';
import { createNotification } from './notification.service';
import { sendFinePaidEmail } from './email.service';
import { evaluateAutoBlock, getOutstandingFineTotal } from './block.service';
import { AuthRequest } from '../types/express.d';
import {
  ListFinesQuery,
  EditFineInput,
  WaiveFineInput,
  PayFineInput,
} from '../validators/fine.validator';

const populateFields = [
  { path: 'student', select: 'fullName email studentProfile status' },
  {
    path: 'transaction',
    select: 'transactionId issueDate dueDate returnDate',
    populate: { path: 'book', select: 'title author bookId' },
  },
  { path: 'waivedBy', select: 'fullName role' },
];

const sanitizeFine = (item: any) => {
  const obj = item.toObject ? item.toObject({ virtuals: true }) : item;
  return {
    id: obj._id?.toString(),
    fineId: obj.fineId,
    transaction: obj.transaction,
    student: obj.student,
    overdueDays: obj.overdueDays,
    amount: obj.amount,
    ratePerDay: obj.ratePerDay,
    paymentStatus: obj.paymentStatus,
    paymentDate: obj.paymentDate,
    waivedBy: obj.waivedBy,
    waivedReason: obj.waivedReason,
    notes: obj.notes,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const sanitizePayment = (item: any) => {
  const obj = item.toObject ? item.toObject({ virtuals: true }) : item;
  return {
    id: obj._id?.toString(),
    paymentId: obj.paymentId,
    fine: obj.fine?.toString?.() || obj.fine,
    student: obj.student,
    originalAmount: obj.originalAmount ?? obj.amount,
    discount: obj.discount ?? 0,
    amount: obj.amount,
    paymentMethod: obj.paymentMethod,
    collectedBy: obj.collectedBy,
    receiptNumber: obj.receiptNumber,
    notes: obj.notes,
    paidAt: obj.paidAt || obj.createdAt,
    createdAt: obj.createdAt,
  };
};

const parsePaymentDateTime = (paymentDate: string, paymentTime: string): Date => {
  const [year, month, day] = paymentDate.split('-').map(Number);
  const [hours, minutes] = paymentTime.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getFineOrThrow = async (id: string): Promise<IFine> => {
  const fine = await Fine.findById(id);
  if (!fine) throw ApiError.notFound('Fine not found');
  return fine;
};

const assertCanAccessFine = (fine: IFine, req: AuthRequest) => {
  if (req.user.role === 'student' && fine.student.toString() !== req.user.id) {
    throw ApiError.forbidden('You can only view your own fines');
  }
};

export const calculateOverdueFine = (
  dueDate: Date,
  asOf: Date,
  gracePeriodDays: number,
  ratePerDay: number
) => {
  const overdueDays = Math.max(0, daysBetween(dueDate, asOf) - gracePeriodDays);
  const amount = overdueDays * ratePerDay;
  return { overdueDays, amount };
};

export const upsertPendingFineForTransaction = async (
  transaction: IBorrowTransaction,
  overdueDays: number,
  ratePerDay: number,
  notes?: string
): Promise<IFine | null> => {
  if (overdueDays <= 0) return null;

  const amount = overdueDays * ratePerDay;
  const existingPending = await Fine.findOne({
    transaction: transaction._id,
    paymentStatus: 'pending',
  });

  if (existingPending) {
    existingPending.overdueDays = overdueDays;
    existingPending.amount = amount;
    existingPending.ratePerDay = ratePerDay;
    if (notes !== undefined) existingPending.notes = notes;
    await existingPending.save();
    return existingPending;
  }

  const settledFine = await Fine.findOne({
    transaction: transaction._id,
    paymentStatus: { $in: ['paid', 'waived'] },
  });
  if (settledFine) return null;

  const fineId = await generateSequentialId('FNE', Fine, 'fineId');
  const fine = await Fine.create({
    fineId,
    transaction: transaction._id,
    student: transaction.student,
    overdueDays,
    amount,
    ratePerDay,
    paymentStatus: 'pending',
    notes: notes || 'Overdue book fine',
  });

  return fine;
};

export const syncOverdueFines = async (): Promise<number> => {
  const settings = await getSystemSettings();
  const now = new Date();
  const { gracePeriodDays, ratePerDay } = settings.fineRules;

  await BorrowTransaction.updateMany(
    { status: 'borrowed', dueDate: { $lt: now } },
    { status: 'overdue' }
  );

  const overdueTransactions = await BorrowTransaction.find({ status: 'overdue' });
  let synced = 0;

  for (const transaction of overdueTransactions) {
    const { overdueDays, amount } = calculateOverdueFine(
      transaction.dueDate,
      now,
      gracePeriodDays,
      ratePerDay
    );

    if (overdueDays <= 0) continue;

    const settledFine = await Fine.findOne({
      transaction: transaction._id,
      paymentStatus: { $in: ['paid', 'waived'] },
    });
    if (settledFine) continue;

    await upsertPendingFineForTransaction(transaction, overdueDays, ratePerDay);

    transaction.fineAmount = amount;
    transaction.finePaidStatus = 'pending';
    await transaction.save();
    synced++;
  }

  return synced;
};

export const fineService = {
  list: async (query: ListFinesQuery, req: AuthRequest) => {
    await syncOverdueFines();

    const { skip, limit, page, sort } = parsePagination(query);
    const filter: FilterQuery<IFine> = {};

    if (req.user.role === 'student') {
      filter.student = req.user.id;
    } else if (query.studentId) {
      filter.student = query.studentId;
    }

    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    const [fines, total] = await Promise.all([
      Fine.find(filter).populate(populateFields).sort(sort).skip(skip).limit(limit),
      Fine.countDocuments(filter),
    ]);

    return {
      fines: fines.map((f) => sanitizeFine(f)),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  getById: async (id: string, req: AuthRequest) => {
    const fine = await Fine.findById(id).populate(populateFields);
    if (!fine) throw ApiError.notFound('Fine not found');
    assertCanAccessFine(fine, req);
    return sanitizeFine(fine);
  },

  getSummary: async (req: AuthRequest, studentId?: string) => {
    await syncOverdueFines();

    if (req.user.role === 'student') {
      if (studentId && studentId !== req.user.id) {
        throw ApiError.forbidden('You can only view your own fine summary');
      }
      const targetId = req.user.id;
      const [outstandingTotal, pendingCount, paidCount, waivedCount] = await Promise.all([
        getOutstandingFineTotal(targetId),
        Fine.countDocuments({ student: targetId, paymentStatus: 'pending' }),
        Fine.countDocuments({ student: targetId, paymentStatus: 'paid' }),
        Fine.countDocuments({ student: targetId, paymentStatus: 'waived' }),
      ]);
      return { outstandingTotal, pendingCount, paidCount, waivedCount };
    }

    const filter: FilterQuery<IFine> = studentId ? { student: studentId } : {};

    const [outstandingResult, pendingCount, paidCount, waivedCount] = await Promise.all([
      Fine.aggregate([
        { $match: { ...filter, paymentStatus: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Fine.countDocuments({ ...filter, paymentStatus: 'pending' }),
      Fine.countDocuments({ ...filter, paymentStatus: 'paid' }),
      Fine.countDocuments({ ...filter, paymentStatus: 'waived' }),
    ]);

    return {
      outstandingTotal: outstandingResult[0]?.total || 0,
      pendingCount,
      paidCount,
      waivedCount,
    };
  },

  getFinanceDetails: async (req: AuthRequest, studentId?: string) => {
    await syncOverdueFines();

    const filter: FilterQuery<IFine> = {};
    if (req.user.role === 'student') {
      filter.student = req.user.id;
    } else if (studentId) {
      filter.student = studentId;
    }

    const [pendingDocs, paidDocs, waivedDocs] = await Promise.all([
      Fine.find({ ...filter, paymentStatus: 'pending' })
        .populate(populateFields)
        .sort('-createdAt')
        .limit(500),
      Fine.find({ ...filter, paymentStatus: 'paid' })
        .populate(populateFields)
        .sort('-paymentDate')
        .limit(500),
      Fine.find({ ...filter, paymentStatus: 'waived' })
        .populate(populateFields)
        .sort('-paymentDate')
        .limit(500),
    ]);

    const allFineIds = [...paidDocs, ...waivedDocs].map((f) => f._id);
    const payments =
      allFineIds.length > 0
        ? await Payment.find({ fine: { $in: allFineIds } })
            .populate([{ path: 'collectedBy', select: 'fullName role' }])
            .sort({ paidAt: -1 })
        : [];

    const latestPaymentByFine = new Map<string, ReturnType<typeof sanitizePayment>>();
    for (const payment of payments) {
      const fineId = payment.fine.toString();
      if (!latestPaymentByFine.has(fineId)) {
        latestPaymentByFine.set(fineId, sanitizePayment(payment));
      }
    }

    const pending = pendingDocs.map((f) => sanitizeFine(f));
    const paid = paidDocs.map((f) => ({
      ...sanitizeFine(f),
      payment: latestPaymentByFine.get(f._id.toString()),
    }));
    const waived = waivedDocs.map((f) => ({
      ...sanitizeFine(f),
      payment: latestPaymentByFine.get(f._id.toString()),
    }));

    const paidPayments = payments.filter((p) => p.paymentMethod !== 'waived');
    const outstandingTotal = pending.reduce((sum, f) => sum + f.amount, 0);
    const paidTotalCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDiscount = paidPayments.reduce((sum, p) => sum + (p.discount || 0), 0);
    const waivedTotalAmount = waived.reduce((sum, f) => sum + f.amount, 0);

    return {
      outstandingTotal,
      paidTotalCollected,
      waivedTotalAmount,
      totalDiscount,
      totalFinesCount: pending.length + paid.length + waived.length,
      pendingCount: pending.length,
      paidCount: paid.length,
      waivedCount: waived.length,
      pending,
      paid,
      waived,
    };
  },

  edit: async (id: string, input: EditFineInput, req: AuthRequest) => {
    const fine = await getFineOrThrow(id);

    if (fine.paymentStatus !== 'pending') {
      throw ApiError.badRequest('Only pending fines can be edited');
    }

    const previousAmount = fine.amount;
    fine.amount = input.amount;
    if (input.notes !== undefined) fine.notes = input.notes;
    await fine.save();

    const transaction = await BorrowTransaction.findById(fine.transaction);
    if (transaction) {
      transaction.fineAmount = input.amount;
      await transaction.save();
    }

    await createAuditLog(req, 'fine.edit', 'Fine', id, {
      previousAmount,
      newAmount: input.amount,
    });

    const populated = await Fine.findById(id).populate(populateFields);
    return sanitizeFine(populated!);
  },

  waive: async (id: string, input: WaiveFineInput, req: AuthRequest) => {
    const fine = await getFineOrThrow(id);

    if (fine.paymentStatus !== 'pending') {
      throw ApiError.badRequest('Only pending fines can be waived');
    }

    fine.paymentStatus = 'waived';
    fine.waivedBy = new mongoose.Types.ObjectId(req.user.id);
    fine.waivedReason = input.reason;
    fine.paymentDate = new Date();
    await fine.save();

    const transaction = await BorrowTransaction.findById(fine.transaction);
    if (transaction) {
      transaction.finePaidStatus = 'waived';
      await transaction.save();
    }

    const paymentId = await generateSequentialId('PAY', Payment, 'paymentId');
    await Payment.create({
      paymentId,
      fine: fine._id,
      student: fine.student,
      originalAmount: fine.amount,
      discount: fine.amount,
      amount: 0,
      paymentMethod: 'waived',
      collectedBy: req.user.id,
      notes: input.reason,
      paidAt: new Date(),
    });

    const student = await User.findById(fine.student);
    if (student) {
      await createNotification({
        recipientId: student._id.toString(),
        type: 'fine_waived',
        title: 'Fine Waived',
        message: `Your fine ${fine.fineId} has been waived.`,
        entityType: 'Fine',
        entityId: fine._id.toString(),
      });
    }

    await createAuditLog(req, 'fine.waive', 'Fine', id, { reason: input.reason });

    const populated = await Fine.findById(id).populate(populateFields);
    return sanitizeFine(populated!);
  },

  pay: async (id: string, input: PayFineInput, req: AuthRequest) => {
    const fine = await getFineOrThrow(id);

    if (fine.paymentStatus !== 'pending') {
      throw ApiError.badRequest('Only pending fines can be paid');
    }

    if (input.discount > fine.amount) {
      throw ApiError.badRequest('Discount cannot exceed the fine amount');
    }

    const expectedPaid = fine.amount - input.discount;
    if (input.amountPaid !== expectedPaid) {
      throw ApiError.badRequest(
        `Amount paid must equal fine amount minus discount (Rs. ${expectedPaid})`
      );
    }

    const paidAt = parsePaymentDateTime(input.paymentDate, input.paymentTime);

    fine.paymentStatus = 'paid';
    fine.paymentDate = paidAt;
    await fine.save();

    const transaction = await BorrowTransaction.findById(fine.transaction).populate({
      path: 'book',
      select: 'title',
    });
    if (transaction) {
      transaction.finePaidStatus = 'paid';
      await transaction.save();
    }

    const paymentId = await generateSequentialId('PAY', Payment, 'paymentId');
    const [payment] = await Payment.create([
      {
        paymentId,
        fine: fine._id,
        student: fine.student,
        originalAmount: fine.amount,
        discount: input.discount,
        amount: input.amountPaid,
        paymentMethod: input.paymentMethod,
        collectedBy: req.user.id,
        receiptNumber: input.receiptNumber,
        notes: input.notes,
        paidAt,
      },
    ]);

    await Payment.findById(payment._id).populate([
      { path: 'collectedBy', select: 'fullName role' },
      { path: 'student', select: 'fullName email' },
    ]);

    const student = await User.findById(fine.student);
    if (student) {
      const bookTitle =
        transaction && typeof transaction.book === 'object' && 'title' in transaction.book
          ? (transaction.book as { title: string }).title
          : 'borrowed book';

      await sendFinePaidEmail(
        student.email,
        student.fullName,
        fine.fineId,
        input.amountPaid,
        bookTitle
      );
      const discountNote =
        input.discount > 0 ? ` (discount Rs. ${input.discount} applied)` : '';
      await createNotification({
        recipientId: student._id.toString(),
        type: 'fine_paid',
        title: 'Fine Payment Received',
        message: `Payment of Rs. ${input.amountPaid} received for fine ${fine.fineId}.${discountNote}`,
        entityType: 'Fine',
        entityId: fine._id.toString(),
      });
    }

    await createAuditLog(req, 'fine.pay', 'Fine', id, {
      originalAmount: fine.amount,
      discount: input.discount,
      amountPaid: input.amountPaid,
      paymentMethod: input.paymentMethod,
      paymentId,
      paidAt,
    });

    const populated = await Fine.findById(id).populate(populateFields);
    return {
      fine: sanitizeFine(populated!),
      payment: sanitizePayment(
        await Payment.findById(payment._id).populate([
          { path: 'collectedBy', select: 'fullName role' },
        ])
      ),
    };
  },

  listPayments: async (fineId: string, req: AuthRequest) => {
    const fine = await getFineOrThrow(fineId);
    assertCanAccessFine(fine, req);

    const payments = await Payment.find({ fine: fineId })
      .populate([{ path: 'collectedBy', select: 'fullName role' }])
      .sort({ createdAt: -1 });

    return payments.map((p) => sanitizePayment(p));
  },
};

export const triggerAutoBlockAfterFine = async (
  studentId: string,
  req?: AuthRequest
): Promise<{ blocked: boolean; reason?: string }> => {
  return evaluateAutoBlock(studentId, req);
};
