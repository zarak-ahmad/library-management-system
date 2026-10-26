import mongoose, { FilterQuery } from 'mongoose';
import { Reservation, IReservation } from '../models/Reservation.model';
import { Book } from '../models/Book.model';
import { User } from '../models/User.model';
import { getSystemSettings } from '../models/SystemSettings.model';
import { ApiError } from '../utils/ApiError';
import { generateSequentialId, addDays } from '../utils/generateId';
import {
  assertStudentCanBorrow,
  reserveCopy,
  releaseReservedCopy,
} from '../utils/borrowHelpers';
import { createAuditLog } from './audit.service';
import { createNotification } from './notification.service';
import { sendReservationConfirmationEmail } from './email.service';
import { AuthRequest } from '../types/express.d';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { withTransaction, saveOptions, createOptions } from '../utils/mongoTransaction';
import { CreateReservationInput, ListReservationsQuery } from '../validators/borrow.validator';

const populateFields = [
  { path: 'student', select: 'fullName email studentProfile' },
  { path: 'book', select: 'title author bookId isbn coverImage availableCopies' },
];

const sanitizeReservation = (item: any) => {
  const obj = item.toObject ? item.toObject({ virtuals: true }) : item;
  return {
    id: obj._id?.toString(),
    reservationId: obj.reservationId,
    student: obj.student,
    book: obj.book,
    reservationDate: obj.reservationDate,
    expiryDate: obj.expiryDate,
    status: obj.status,
    cancelledAt: obj.cancelledAt,
    completedAt: obj.completedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

export const reservationService = {
  list: async (query: ListReservationsQuery, req: AuthRequest) => {
    const { skip, limit, page, sort } = parsePagination(query);
    const filter: FilterQuery<IReservation> = {};

    if (req.user.role === 'student') {
      filter.student = req.user.id;
    } else if (query.studentId) {
      filter.student = query.studentId;
    }

    if (query.status) filter.status = query.status;
    if (query.bookId) filter.book = query.bookId;

    const [reservations, total] = await Promise.all([
      Reservation.find(filter).populate(populateFields).sort(sort).skip(skip).limit(limit),
      Reservation.countDocuments(filter),
    ]);

    return {
      reservations: reservations.map((r) => sanitizeReservation(r)),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  create: async (input: CreateReservationInput, req: AuthRequest) => {
    await assertStudentCanBorrow(req.user.id);

    const existingActive = await Reservation.findOne({
      student: req.user.id,
      book: input.bookId,
      status: 'active',
    });

    if (existingActive) {
      throw ApiError.conflict('You already have an active reservation for this book');
    }

    const reservation = await withTransaction(async (session) => {
      const bookQuery = Book.findOne({ _id: input.bookId, deletedAt: { $exists: false } });
      const book = session ? await bookQuery.session(session) : await bookQuery;
      if (!book) throw ApiError.notFound('Book not found');

      reserveCopy(book);
      await book.save(saveOptions(session));

      const settings = await getSystemSettings();
      const reservationDate = new Date();
      const expiryDate = addDays(reservationDate, settings.borrowRules.reservationExpiryDays);
      const reservationId = await generateSequentialId('RES', Reservation, 'reservationId');

      const [created] = await Reservation.create(
        [
          {
            reservationId,
            student: req.user.id,
            book: input.bookId,
            reservationDate,
            expiryDate,
            status: 'active',
          },
        ],
        createOptions(session)
      );

      return { reservation: created, book, expiryDate };
    });

    const student = await User.findById(req.user.id);
    if (student) {
      await sendReservationConfirmationEmail(
        student.email,
        student.fullName,
        reservation.book.title,
        reservation.expiryDate
      );
      await createNotification({
        recipientId: req.user.id,
        type: 'reservation_reminder',
        title: 'Reservation Confirmed',
        message: `"${reservation.book.title}" reserved until ${reservation.expiryDate.toLocaleDateString()}`,
        entityType: 'Reservation',
        entityId: reservation.reservation._id.toString(),
      });
    }

    await createAuditLog(req, 'reservation.create', 'Reservation', reservation.reservation._id.toString());

    const populated = await Reservation.findById(reservation.reservation._id).populate(populateFields);
    return sanitizeReservation(populated!);
  },

  cancel: async (id: string, req: AuthRequest) => {
    const filter: FilterQuery<IReservation> = { _id: id, status: 'active' };
    if (req.user.role === 'student') filter.student = req.user.id;

    const cancelled = await withTransaction(async (session) => {
      const reservationQuery = Reservation.findOne(filter);
      const reservation = session
        ? await reservationQuery.session(session)
        : await reservationQuery;
      if (!reservation) throw ApiError.notFound('Active reservation not found');

      const bookQuery = Book.findById(reservation.book);
      const book = session ? await bookQuery.session(session) : await bookQuery;
      if (!book) throw ApiError.notFound('Book not found');

      releaseReservedCopy(book);
      await book.save(saveOptions(session));

      reservation.status = 'cancelled';
      reservation.cancelledAt = new Date();
      await reservation.save(saveOptions(session));

      return reservation;
    });

    await createAuditLog(req, 'reservation.cancel', 'Reservation', cancelled._id.toString());

    const populated = await Reservation.findById(cancelled._id).populate(populateFields);
    return sanitizeReservation(populated!);
  },

  complete: async (id: string, req: AuthRequest) => {
    const reservation = await Reservation.findOne({ _id: id, status: 'active' });
    if (!reservation) throw ApiError.notFound('Active reservation not found');

    reservation.status = 'completed';
    reservation.completedAt = new Date();
    await reservation.save();

    await createAuditLog(req, 'reservation.complete', 'Reservation', reservation._id.toString());

    const populated = await Reservation.findById(reservation._id).populate(populateFields);
    return sanitizeReservation(populated!);
  },

  expireReservations: async (): Promise<number> => {
    const now = new Date();
    const expired = await Reservation.find({ status: 'active', expiryDate: { $lt: now } });

    let count = 0;
    for (const reservation of expired) {
      try {
        await withTransaction(async (session) => {
          const bookQuery = Book.findById(reservation.book);
          const book = session ? await bookQuery.session(session) : await bookQuery;
          if (book) {
            releaseReservedCopy(book);
            await book.save(saveOptions(session));
          }
          reservation.status = 'expired';
          await reservation.save(saveOptions(session));
        });
        count++;
      } catch {
        // skip failed expiry entries
      }
    }

    return count;
  },
};
