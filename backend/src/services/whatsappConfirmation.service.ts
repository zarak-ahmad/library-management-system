import crypto from 'crypto';
import mongoose from 'mongoose';
import { WhatsAppConfirmation } from '../models/WhatsAppConfirmation.model';
import { BookRequest } from '../models/BookRequest.model';
import { Book } from '../models/Book.model';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { generateSequentialId } from '../utils/generateId';
import { issueBookToStudent } from './borrow.service';
import { createNotification } from './notification.service';
import { sendBookRejectedEmail } from './email.service';
import { AWAITING_STUDENT_POLL_STATUSES } from './bookRequestLifecycle.service';
import {
  sendBookIssueConfirmationWhatsApp,
  sendBookRequestConfirmationWhatsApp,
  sendBookApprovedWhatsApp,
  sendBookRequestAckWhatsApp,
  buildBookRequestConfirmAck,
  buildBookRequestCancelAck,
  buildBookIssueConfirmAck,
  buildBookIssueCancelAck,
  fetchWasenderMessageInfo,
  parsePollVoteFromMessageInfo,
} from './whatsapp.service';
import { phoneDigitsOnly, phonesMatch, normalizePhoneForWhatsApp } from '../utils/phone';
import { env } from '../config/env';
import {
  getConfirmationConfirmUrl,
  getConfirmationCancelUrl,
  getConfirmationPageUrl,
  resolvePublicMediaUrl,
} from '../utils/publicAppUrl';
import type { LinkActionPageData, LinkActionOutcome } from '../views/requestConfirmationResult';

const CONFIRMATION_TTL_HOURS = 24;

const generateToken = () => crypto.randomBytes(8).toString('hex');

const expiresAtFromNow = () => {
  const date = new Date();
  date.setHours(date.getHours() + CONFIRMATION_TTL_HOURS);
  return date;
};

const confirmationFrontendUrl = (token: string): string => getConfirmationPageUrl(token);

const confirmationLinkUrls = (token: string) => ({
  confirmUrl: getConfirmationConfirmUrl(token),
  cancelUrl: getConfirmationCancelUrl(token),
});

const loadConfirmationContext = async (token: string) => {
  const confirmation = await WhatsAppConfirmation.findOne({ token })
    .populate('student', 'fullName email phone')
    .populate('book', 'title author isbn bookId shelfLocation coverImage')
    .populate('bookRequest', 'requestId status requestDate');

  if (!confirmation) return null;

  const student = confirmation.student as unknown as InstanceType<typeof User>;
  const book = confirmation.book as unknown as InstanceType<typeof Book>;
  const request = confirmation.bookRequest as unknown as
    | (InstanceType<typeof BookRequest> & { requestId?: string; status?: string })
    | null;

  return {
    confirmation,
    student,
    book,
    request,
    coverImageUrl: resolvePublicMediaUrl(book?.coverImage?.url) || undefined,
  };
};

const buildLinkActionPage = (
  outcome: LinkActionOutcome,
  title: string,
  message: string,
  ctx: NonNullable<Awaited<ReturnType<typeof loadConfirmationContext>>>
): LinkActionPageData => ({
  outcome,
  title,
  message,
  studentName: ctx.student?.fullName || 'Student',
  bookTitle: ctx.book?.title || 'Book',
  bookAuthor: ctx.book?.author,
  bookIsbn: ctx.book?.isbn,
  bookId: ctx.book?.bookId,
  shelfLocation: ctx.book?.shelfLocation,
  requestId: ctx.request?.requestId,
  requestStatus: ctx.request?.status,
  coverImageUrl: ctx.coverImageUrl,
});

const bookDetailsForWhatsApp = (book: InstanceType<typeof Book>) => ({
  bookTitle: book.title,
  bookAuthor: book.author,
  bookIsbn: book.isbn,
  bookId: book.bookId,
  bookPublisher: book.publisher,
  bookEdition: book.edition,
  publishedYear: book.publishedYear,
  shelfLocation: book.shelfLocation,
  language: book.language,
  description: book.description,
  coverImageUrl: book.coverImage?.url,
});

const isAwaitingStudentPoll = (status: string): boolean =>
  (AWAITING_STUDENT_POLL_STATUSES as readonly string[]).includes(status);

const expireIfNeeded = async (confirmation: InstanceType<typeof WhatsAppConfirmation>) => {
  if (confirmation.status !== 'pending') return confirmation;
  if (confirmation.expiresAt > new Date()) return confirmation;

  confirmation.status = 'expired';
  confirmation.respondedAt = new Date();
  await confirmation.save();

  if (confirmation.type === 'book_issue' && confirmation.bookRequest) {
    const bookRequest = await BookRequest.findById(confirmation.bookRequest);
    if (bookRequest?.status === 'awaiting_confirmation') {
      bookRequest.status = 'confirmed';
      await bookRequest.save();
    }
  }

  if (confirmation.type === 'book_request' && confirmation.bookRequest) {
    const bookRequest = await BookRequest.findById(confirmation.bookRequest);
    if (bookRequest && isAwaitingStudentPoll(bookRequest.status)) {
      bookRequest.status = 'canceled';
      bookRequest.remarks = 'WhatsApp confirmation expired';
      bookRequest.processedAt = new Date();
      await bookRequest.save();
    }
  }

  return confirmation;
};

const getBookAndStudent = async (bookId: string, studentId: string) => {
  const [book, student] = await Promise.all([
    Book.findOne({ _id: bookId, deletedAt: { $exists: false } }),
    User.findById(studentId),
  ]);

  if (!book) throw ApiError.notFound('Book not found');
  if (!student) throw ApiError.notFound('Student not found');

  return { book, student };
};

const getStatusMessage = (
  confirmation: InstanceType<typeof WhatsAppConfirmation>
): string => {
  if (confirmation.status === 'pending') {
    return confirmation.type === 'book_request'
      ? 'Waiting for your confirmation'
      : 'Waiting for your pickup confirmation';
  }
  if (confirmation.status === 'confirmed') {
    return confirmation.type === 'book_request'
      ? 'This request has already been confirmed.'
      : 'This pickup has already been confirmed.';
  }
  if (confirmation.status === 'declined') {
    return confirmation.type === 'book_request'
      ? 'This request was cancelled.'
      : 'This pickup was cancelled.';
  }
  return 'This confirmation link has expired.';
};

export const whatsappConfirmationService = {
  getConfirmationPageData: async (token: string) => {
    const confirmation = await WhatsAppConfirmation.findOne({ token })
      .populate('student', 'fullName email phone')
      .populate(
        'book',
        'title author isbn bookId publisher edition publishedYear shelfLocation language description coverImage'
      )
      .populate('bookRequest', 'requestId requestDate status remarks createdAt updatedAt')
      .populate('initiatedBy', 'fullName');

    if (!confirmation) {
      throw ApiError.notFound('Confirmation not found');
    }

    await expireIfNeeded(confirmation);
    await confirmation.populate([
      { path: 'student', select: 'fullName email phone' },
      {
        path: 'book',
        select: 'title author isbn bookId publisher edition publishedYear shelfLocation language description coverImage',
      },
      { path: 'bookRequest', select: 'requestId requestDate status remarks createdAt updatedAt' },
      { path: 'initiatedBy', select: 'fullName' },
    ]);

    const student = confirmation.student as unknown as InstanceType<typeof User>;
    const book = confirmation.book as unknown as InstanceType<typeof Book>;
    const request = confirmation.bookRequest as unknown as
      | (InstanceType<typeof BookRequest> & {
          requestId?: string;
          requestDate?: Date;
          remarks?: string;
          createdAt?: Date;
          updatedAt?: Date;
        })
      | null;
    const initiatedBy = confirmation.initiatedBy as unknown as { fullName?: string } | null;

    return {
      token: confirmation.token,
      type: confirmation.type,
      status: confirmation.status,
      expiresAt: confirmation.expiresAt,
      respondedAt: confirmation.respondedAt,
      canRespond: confirmation.status === 'pending' && confirmation.expiresAt > new Date(),
      title:
        confirmation.type === 'book_request'
          ? 'Confirm Your Book Request'
          : 'Confirm Book Pickup',
      message: getStatusMessage(confirmation),
      ...confirmationLinkUrls(confirmation.token),
      student: {
        fullName: student?.fullName,
        email: student?.email,
        phone: student?.phone,
      },
      book: {
        title: book?.title,
        author: book?.author,
        isbn: book?.isbn,
        bookId: book?.bookId,
        publisher: book?.publisher,
        edition: book?.edition,
        publishedYear: book?.publishedYear,
        shelfLocation: book?.shelfLocation,
        language: book?.language,
        description: book?.description,
        coverImage: book?.coverImage,
      },
      request: request
        ? {
            id: request._id.toString(),
            requestId: request.requestId,
            requestDate: request.requestDate,
            status: request.status,
            remarks: request.remarks,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
          }
        : null,
      initiatedBy: initiatedBy?.fullName || null,
    };
  },

  processLinkAction: async (token: string, accepted: boolean): Promise<LinkActionPageData> => {
    const invalid = (message: string): LinkActionPageData => ({
      outcome: 'invalid',
      title: 'Link not valid',
      message,
      studentName: '—',
      bookTitle: '—',
    });

    if (!/^[a-f0-9]{16}$/i.test(token)) {
      return invalid('This confirmation link is invalid.');
    }

    let ctx = await loadConfirmationContext(token);
    if (!ctx) {
      return invalid('This confirmation link was not found.');
    }

    const priorStatus = ctx.confirmation.status;
    await expireIfNeeded(ctx.confirmation);

    ctx = (await loadConfirmationContext(token))!;
    const { student, book, confirmation } = ctx;
    const bookTitle = book?.title || 'your book';
    const studentName = student?.fullName || 'Student';

    if (confirmation.status === 'expired') {
      return buildLinkActionPage(
        'expired',
        'Link expired',
        `Hi ${studentName}, this confirmation link for '${bookTitle}' has expired. Please request the book again from the library.`,
        ctx
      );
    }

    if (confirmation.status === 'pending') {
      await whatsappConfirmationService.handleResponse(token, accepted);
      ctx = (await loadConfirmationContext(token))!;
    }

    const refreshed = ctx.confirmation;
    const isBookRequest = refreshed.type === 'book_request';

    if (accepted) {
      if (refreshed.status === 'declined') {
        return buildLinkActionPage(
          'already_cancelled',
          'Already cancelled',
          `Hi ${studentName}, your book reservation for '${bookTitle}' was already cancelled.`,
          ctx
        );
      }

      if (isBookRequest) {
        const title = 'Book reserved';
        const message =
          priorStatus === 'pending'
            ? `Hi ${studentName}, your book '${bookTitle}' is reserved. Your request is confirmed and waiting for librarian approval.`
            : `Hi ${studentName}, your book '${bookTitle}' is already reserved and confirmed.`;
        return buildLinkActionPage(
          priorStatus === 'pending' ? 'confirmed' : 'already_confirmed',
          title,
          message,
          ctx
        );
      }

      const title = 'Book issued';
      const message =
        priorStatus === 'pending'
          ? `Hi ${studentName}, your book '${bookTitle}' has been issued to you. Please collect it from the library.`
          : `Hi ${studentName}, your book '${bookTitle}' was already issued.`;
      return buildLinkActionPage(
        priorStatus === 'pending' ? 'confirmed' : 'already_confirmed',
        title,
        message,
        ctx
      );
    }

    if (refreshed.status === 'confirmed') {
      return buildLinkActionPage(
        'already_confirmed',
        'Already confirmed',
        `Hi ${studentName}, your book '${bookTitle}' is already reserved and cannot be cancelled from this link.`,
        ctx
      );
    }

    const cancelTitle = isBookRequest ? 'Reservation cancelled' : 'Pickup cancelled';
    const cancelMessage =
      priorStatus === 'pending'
        ? `Hi ${studentName}, your book reservation for '${bookTitle}' has been cancelled.`
        : `Hi ${studentName}, your book reservation for '${bookTitle}' was already cancelled.`;

    return buildLinkActionPage(
      priorStatus === 'pending' ? 'cancelled' : 'already_cancelled',
      cancelTitle,
      cancelMessage,
      ctx
    );
  },

  respondFromPortal: async (token: string, accepted: boolean) => {
    const result = await whatsappConfirmationService.handleResponse(token, accepted);
    const confirmation = await WhatsAppConfirmation.findOne({ token }).populate(
      'bookRequest',
      'requestId status'
    );

    const request = confirmation?.bookRequest as unknown as
      | (InstanceType<typeof BookRequest> & { requestId?: string })
      | null;

    return {
      ...result,
      request: request
        ? {
            id: request._id.toString(),
            requestId: request.requestId,
            status: request.status,
          }
        : null,
    };
  },

  createBookRequestConfirmation: async (
    studentId: string,
    bookId: string,
    phone: string,
    bookRequestId?: string
  ) => {
    const { book, student } = await getBookAndStudent(bookId, studentId);

    const normalizedPhone = normalizePhoneForWhatsApp(phone, env.WHATSAPP_DEFAULT_COUNTRY_CODE);
    if (!normalizedPhone) {
      throw ApiError.badRequest('Invalid phone number for WhatsApp confirmation');
    }
    const phoneForStorage = phoneDigitsOnly(normalizedPhone);

    if (bookRequestId) {
      const linkedRequest = await BookRequest.findOne({
        _id: bookRequestId,
        student: studentId,
        book: bookId,
        status: { $in: AWAITING_STUDENT_POLL_STATUSES },
      });
      if (!linkedRequest) {
        throw ApiError.badRequest('Invalid book request for WhatsApp confirmation');
      }
    }

    const existingPending = await WhatsAppConfirmation.findOne({
      student: studentId,
      book: bookId,
      type: 'book_request',
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      if (bookRequestId) {
        existingPending.bookRequest = new mongoose.Types.ObjectId(bookRequestId);
      }
      existingPending.phone = phoneForStorage;
      await existingPending.save();

      await WhatsAppConfirmation.updateMany(
        {
          student: studentId,
          book: bookId,
          type: 'book_request',
          status: 'pending',
          _id: { $ne: existingPending._id },
        },
        {
          $set: {
            status: 'expired',
            respondedAt: new Date(),
          },
        }
      );

      return { confirmation: existingPending, book, student };
    }

    await WhatsAppConfirmation.updateMany(
      {
        student: studentId,
        book: bookId,
        type: 'book_request',
        status: 'pending',
      },
      {
        $set: {
          status: 'expired',
          respondedAt: new Date(),
        },
      }
    );

    const confirmation = await WhatsAppConfirmation.create({
      token: generateToken(),
      type: 'book_request',
      student: studentId,
      book: bookId,
      bookRequest: bookRequestId ? new mongoose.Types.ObjectId(bookRequestId) : undefined,
      phone: phoneForStorage,
      status: 'pending',
      expiresAt: expiresAtFromNow(),
    });

    return { confirmation, book, student };
  },

  createBookIssueConfirmation: async (
    bookRequestId: string,
    initiatedBy: string,
    remarks?: string
  ) => {
    const bookRequest = await BookRequest.findOne({
      _id: bookRequestId,
      status: 'confirmed',
    }).populate('student book');
    if (!bookRequest) throw ApiError.notFound('Pending book request not found');

    const student = bookRequest.student as unknown as InstanceType<typeof User>;
    const book = bookRequest.book as unknown as InstanceType<typeof Book>;

    if (!student?.phone?.trim()) {
      throw ApiError.badRequest('Student has no phone number for WhatsApp confirmation');
    }

    const existingPending = await WhatsAppConfirmation.findOne({
      bookRequest: bookRequestId,
      type: 'book_issue',
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      return { confirmation: existingPending, bookRequest, book, student };
    }

    bookRequest.status = 'awaiting_confirmation';
    await bookRequest.save();

    const confirmation = await WhatsAppConfirmation.create({
      token: generateToken(),
      type: 'book_issue',
      student: student._id,
      book: book._id,
      bookRequest: bookRequest._id,
      initiatedBy: new mongoose.Types.ObjectId(initiatedBy),
      remarks,
      phone: student.phone,
      status: 'pending',
      expiresAt: expiresAtFromNow(),
    });

    return { confirmation, bookRequest, book, student };
  },

  sendBookRequestConfirmation: async (
    studentId: string,
    bookId: string,
    phone: string,
    bookRequestId?: string,
    options?: { forceResend?: boolean }
  ) => {
    const { confirmation, book, student } =
      await whatsappConfirmationService.createBookRequestConfirmation(
        studentId,
        bookId,
        phone,
        bookRequestId
      );

    const sendResult = await sendBookRequestConfirmationWhatsApp({
      phone,
      fullName: student.fullName,
      ...bookDetailsForWhatsApp(book),
      token: confirmation.token,
      ...confirmationLinkUrls(confirmation.token),
    });

    if (!sendResult.sent) {
      throw ApiError.internal(
        'Failed to send WhatsApp confirmation. Please wait a minute and try again.'
      );
    }

    await whatsappConfirmationService.saveRecipientJid(
      confirmation.token,
      sendResult.recipientJid
    );
    await whatsappConfirmationService.saveWasenderMsgId(confirmation.token, sendResult.msgId);

    return {
      confirmationToken: confirmation.token,
      expiresAt: confirmation.expiresAt,
      message: options?.forceResend
        ? 'WhatsApp confirmation link resent. Tap Confirm or Cancel in the message.'
        : 'WhatsApp confirmation link sent. Tap Confirm or Cancel in the message.',
      resent: Boolean(options?.forceResend),
    };
  },

  sendBookIssueConfirmation: async (
    bookRequestId: string,
    initiatedBy: string,
    remarks?: string
  ) => {
    const { confirmation, bookRequest, book, student } =
      await whatsappConfirmationService.createBookIssueConfirmation(
        bookRequestId,
        initiatedBy,
        remarks
      );

    const sendResult = await sendBookIssueConfirmationWhatsApp({
      phone: student.phone!,
      fullName: student.fullName,
      ...bookDetailsForWhatsApp(book),
      token: confirmation.token,
      ...confirmationLinkUrls(confirmation.token),
    });

    if (!sendResult.sent) {
      throw ApiError.internal(
        'Failed to send WhatsApp confirmation. Please wait a minute and try again.'
      );
    }

    await whatsappConfirmationService.saveRecipientJid(
      confirmation.token,
      sendResult.recipientJid
    );
    await whatsappConfirmationService.saveWasenderMsgId(confirmation.token, sendResult.msgId);

    return {
      confirmationToken: confirmation.token,
      expiresAt: confirmation.expiresAt,
      request: bookRequest,
      message:
        'WhatsApp confirmation link sent to student. The book will be issued only after they confirm.',
    };
  },

  resendBookIssueConfirmation: async (bookRequestId: string) => {
    const bookRequest = await BookRequest.findOne({
      _id: bookRequestId,
      status: 'awaiting_confirmation',
    }).populate('student book');

    if (!bookRequest) {
      throw ApiError.notFound('No request awaiting your WhatsApp confirmation');
    }

    const student = bookRequest.student as unknown as InstanceType<typeof User>;
    const book = bookRequest.book as unknown as InstanceType<typeof Book>;

    if (!student?.phone?.trim()) {
      throw ApiError.badRequest('Student has no phone number for WhatsApp confirmation');
    }

    let confirmation = await WhatsAppConfirmation.findOne({
      bookRequest: bookRequestId,
      type: 'book_issue',
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!confirmation) {
      const lastIssue = await WhatsAppConfirmation.findOne({
        bookRequest: bookRequestId,
        type: 'book_issue',
      }).sort({ createdAt: -1 });

      if (!lastIssue?.initiatedBy) {
        bookRequest.status = 'confirmed';
        await bookRequest.save();
        throw ApiError.badRequest(
          'This request was reset. Please wait for the librarian to approve again.'
        );
      }

      confirmation = await WhatsAppConfirmation.create({
        token: generateToken(),
        type: 'book_issue',
        student: student._id,
        book: book._id,
        bookRequest: bookRequest._id,
        initiatedBy: lastIssue.initiatedBy,
        remarks: lastIssue.remarks,
        phone: student.phone,
        status: 'pending',
        expiresAt: expiresAtFromNow(),
      });
    }

    const sendResult = await sendBookIssueConfirmationWhatsApp({
      phone: student.phone,
      fullName: student.fullName,
      ...bookDetailsForWhatsApp(book),
      token: confirmation.token,
      ...confirmationLinkUrls(confirmation.token),
    });

    if (!sendResult.sent) {
      throw ApiError.internal(
        'Failed to resend WhatsApp confirmation. Please wait a minute and try again.'
      );
    }

    await whatsappConfirmationService.saveRecipientJid(
      confirmation.token,
      sendResult.recipientJid
    );
    await whatsappConfirmationService.saveWasenderMsgId(confirmation.token, sendResult.msgId);

    return {
      confirmationToken: confirmation.token,
      expiresAt: confirmation.expiresAt,
      message:
        'Issue confirmation link resent on WhatsApp. Open the link to confirm or cancel pickup.',
      resent: true,
    };
  },

  resolvePendingByPhone: async (phoneDigits: string, wasenderMsgId?: string) => {
    if (wasenderMsgId?.trim()) {
      const byMsg = await WhatsAppConfirmation.findOne({
        $or: [{ wasenderMsgId: wasenderMsgId.trim() }, { wasenderPollKeyId: wasenderMsgId.trim() }],
        status: 'pending',
        expiresAt: { $gt: new Date() },
      });
      if (byMsg) return byMsg;
    }

    const pending = await WhatsAppConfirmation.find({
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const matching = pending.filter((confirmation) =>
      phonesMatch(confirmation.phone, phoneDigits)
    );
    if (matching.length === 0) {
      return null;
    }
    if (matching.length === 1) {
      return matching[0];
    }

    console.warn(
      `[WhatsApp] ${matching.length} pending confirmations for phone ${phoneDigits}; using most recent`
    );
    return matching[0] ?? null;
  },

  resolvePendingByJid: async (jid: string) => {
    const normalizedJid = phoneDigitsOnly(jid);
    if (!normalizedJid) return null;

    const pending = await WhatsAppConfirmation.find({
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return (
      pending.find((confirmation) => {
        if (confirmation.whatsappJid && phonesMatch(confirmation.whatsappJid, normalizedJid)) {
          return true;
        }
        return phonesMatch(confirmation.phone, normalizedJid);
      }) ?? null
    );
  },

  resolveLatestPending: async () =>
    WhatsAppConfirmation.findOne({
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }),

  saveRecipientJid: async (token: string, recipientJid?: string) => {
    if (!recipientJid?.trim()) return;
    await WhatsAppConfirmation.updateOne(
      { token },
      { whatsappJid: recipientJid.replace(/@.*/, '').trim() }
    );
  },

  saveWasenderMsgId: async (token: string, msgId?: string) => {
    if (!msgId?.trim()) return;
    const id = msgId.trim();
    await WhatsAppConfirmation.updateOne(
      { token },
      { wasenderMsgId: id, wasenderPollKeyId: id }
    );
  },

  saveWasenderPollKeyId: async (token: string, pollKeyId?: string) => {
    if (!pollKeyId?.trim()) return;
    await WhatsAppConfirmation.updateOne({ token }, { wasenderPollKeyId: pollKeyId.trim() });
  },

  handleResponseByWasenderMsgId: async (msgId: string, accepted: boolean) => {
    const confirmation = await WhatsAppConfirmation.findOne({
      $or: [{ wasenderMsgId: msgId }, { wasenderPollKeyId: msgId }],
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!confirmation) {
      return { handled: false, message: 'No pending confirmation found for this poll message' };
    }

    return whatsappConfirmationService.handleResponse(confirmation.token, accepted);
  },

  handlePollVote: async (input: {
    accepted: boolean;
    msgId?: string;
    pollKeyId?: string;
    phone?: string;
    jid?: string;
  }) => {
    const lookupId = input.pollKeyId || input.msgId;

    const persistPollIds = async (token: string) => {
      if (input.pollKeyId) {
        await whatsappConfirmationService.saveWasenderPollKeyId(token, input.pollKeyId);
      }
      if (input.msgId && input.msgId !== input.pollKeyId) {
        await whatsappConfirmationService.saveWasenderMsgId(token, input.msgId);
      }
    };

    // Prefer phone/jid — Wasender poll.results key.id often differs from send API msgId.
    if (input.phone) {
      const pending = await whatsappConfirmationService.resolvePendingByPhone(
        input.phone,
        lookupId
      );
      if (pending) {
        await persistPollIds(pending.token);
        return whatsappConfirmationService.handleResponse(pending.token, input.accepted);
      }

      const byPhone = await whatsappConfirmationService.handleResponseByPhone(
        input.phone,
        input.accepted
      );
      if (byPhone.handled) {
        return byPhone;
      }
    }

    if (input.jid) {
      const byJid = await whatsappConfirmationService.handleResponseByJid(
        input.jid,
        input.accepted
      );
      if (byJid.handled) {
        return byJid;
      }
    }

    if (lookupId) {
      const byMsg = await whatsappConfirmationService.handleResponseByWasenderMsgId(
        lookupId,
        input.accepted
      );
      if (byMsg.handled) {
        return byMsg;
      }
    }

    return { handled: false, message: 'No pending confirmation found for this poll vote' };
  },

  handleResponseByPhone: async (phoneDigits: string, accepted: boolean) => {
    const confirmation = await whatsappConfirmationService.resolvePendingByPhone(phoneDigits);
    if (!confirmation) {
      return { handled: false, message: 'No pending confirmation found for this number' };
    }

    return whatsappConfirmationService.handleResponse(confirmation.token, accepted);
  },

  handleResponseByJid: async (jid: string, accepted: boolean) => {
    const confirmation = await whatsappConfirmationService.resolvePendingByJid(jid);
    if (!confirmation) {
      return { handled: false, message: 'No pending confirmation found for this WhatsApp id' };
    }

    return whatsappConfirmationService.handleResponse(confirmation.token, accepted);
  },

  handleResponseByKeywordOnly: async (accepted: boolean) => {
    const confirmation = await whatsappConfirmationService.resolveLatestPending();
    if (!confirmation) {
      return { handled: false, message: 'No pending confirmation found' };
    }

    console.log(
      `[WhatsApp] Keyword-only reply matched latest pending confirmation token=${confirmation.token}`
    );
    return whatsappConfirmationService.handleResponse(confirmation.token, accepted);
  },

  handleResponse: async (token: string, accepted: boolean) => {
    const confirmation = await WhatsAppConfirmation.findOne({ token });
    if (!confirmation) {
      return { handled: false, message: 'Confirmation not found' };
    }

    await expireIfNeeded(confirmation);
    if (confirmation.status !== 'pending') {
      return { handled: false, message: `Confirmation already ${confirmation.status}` };
    }

    confirmation.status = accepted ? 'confirmed' : 'declined';
    confirmation.respondedAt = new Date();
    await confirmation.save();

    const [student, book] = await Promise.all([
      User.findById(confirmation.student),
      Book.findById(confirmation.book),
    ]);
    const studentName = student?.fullName || 'Student';
    const bookTitle = book?.title || 'your book';

    if (confirmation.type === 'book_request') {
      const result = accepted
        ? await whatsappConfirmationService.confirmBookRequest(confirmation)
        : await whatsappConfirmationService.declineBookRequest(confirmation);

      if (result.handled && confirmation.phone) {
        const ack = accepted
          ? buildBookRequestConfirmAck(studentName, bookTitle)
          : buildBookRequestCancelAck(studentName, bookTitle);
        console.log('[WhatsApp] Sending poll vote ack:', {
          phone: confirmation.phone,
          accepted,
          bookTitle,
        });
        await sendBookRequestAckWhatsApp(confirmation.phone, ack);
      } else if (result.handled && !confirmation.phone) {
        console.warn('[WhatsApp] Poll vote handled but no phone on confirmation — ack skipped');
      }

      return result;
    }

    const issueResult = accepted
      ? await whatsappConfirmationService.confirmBookIssue(confirmation)
      : await whatsappConfirmationService.declineBookIssue(confirmation);

    if (issueResult.handled && confirmation.phone) {
      const ack = accepted
        ? buildBookIssueConfirmAck(studentName, bookTitle)
        : buildBookIssueCancelAck(studentName, bookTitle);
      await sendBookRequestAckWhatsApp(confirmation.phone, ack);
    }

    return issueResult;
  },

  confirmBookRequest: async (confirmation: InstanceType<typeof WhatsAppConfirmation>) => {
    const awaitingPollFilter = { $in: AWAITING_STUDENT_POLL_STATUSES };

    let bookRequest = confirmation.bookRequest
      ? await BookRequest.findOne({
          _id: confirmation.bookRequest,
          status: awaitingPollFilter,
        })
      : null;

    if (!bookRequest) {
      bookRequest = await BookRequest.findOne({
        student: confirmation.student,
        book: confirmation.book,
        status: awaitingPollFilter,
      }).sort({ createdAt: -1 });
    }

    if (bookRequest) {
      if (
        !confirmation.bookRequest ||
        confirmation.bookRequest.toString() !== bookRequest._id.toString()
      ) {
        confirmation.bookRequest = bookRequest._id;
        await confirmation.save();
      }

      bookRequest.status = 'confirmed';
      await bookRequest.save();

      await createNotification({
        recipientId: confirmation.student.toString(),
        type: 'book_request_confirmed',
        title: 'Reservation Confirmed',
        message: 'Your book reservation is confirmed and waiting for librarian approval.',
        entityType: 'BookRequest',
        entityId: bookRequest._id.toString(),
      });

      return {
        handled: true,
        type: 'book_request' as const,
        accepted: true,
        message: 'Book reservation confirmed after WhatsApp poll',
        bookRequestId: bookRequest._id.toString(),
      };
    }

    const existingConfirmed = await BookRequest.findOne({
      student: confirmation.student,
      book: confirmation.book,
      status: 'confirmed',
    });

    if (existingConfirmed) {
      return {
        handled: true,
        type: 'book_request' as const,
        accepted: true,
        message: 'Book reservation already confirmed',
        bookRequestId: existingConfirmed._id.toString(),
      };
    }

    const requestId = await generateSequentialId('REQ', BookRequest, 'requestId');
    const created = await BookRequest.create({
      requestId,
      student: confirmation.student,
      book: confirmation.book,
      requestDate: new Date(),
      status: 'confirmed',
    });

    await createNotification({
      recipientId: confirmation.student.toString(),
      type: 'book_request_confirmed',
      title: 'Request Confirmed',
      message: 'Your book request was saved and is waiting for librarian approval.',
      entityType: 'BookRequest',
      entityId: created._id.toString(),
    });

    return {
      handled: true,
      type: 'book_request' as const,
      accepted: true,
      message: 'Book request saved after WhatsApp confirmation',
      bookRequestId: created._id.toString(),
    };
  },

  declineBookRequest: async (confirmation: InstanceType<typeof WhatsAppConfirmation>) => {
    const awaitingPollFilter = { $in: AWAITING_STUDENT_POLL_STATUSES };

    let bookRequest = confirmation.bookRequest
      ? await BookRequest.findOne({
          _id: confirmation.bookRequest,
          status: awaitingPollFilter,
        })
      : null;

    if (!bookRequest) {
      bookRequest = await BookRequest.findOne({
        student: confirmation.student,
        book: confirmation.book,
        status: awaitingPollFilter,
      }).sort({ createdAt: -1 });
    }

    if (bookRequest) {
      if (
        !confirmation.bookRequest ||
        confirmation.bookRequest.toString() !== bookRequest._id.toString()
      ) {
        confirmation.bookRequest = bookRequest._id;
        await confirmation.save();
      }

      bookRequest.status = 'canceled';
      bookRequest.remarks = 'Cancelled via WhatsApp';
      bookRequest.processedAt = new Date();
      await bookRequest.save();
    }

    return {
      handled: true,
      type: 'book_request' as const,
      accepted: false,
      message: 'Book reservation cancelled (student voted cancel on WhatsApp)',
    };
  },

  confirmBookIssue: async (confirmation: InstanceType<typeof WhatsAppConfirmation>) => {
    if (!confirmation.bookRequest || !confirmation.initiatedBy) {
      throw ApiError.internal('Invalid issue confirmation record');
    }

    const bookRequest = await BookRequest.findOne({
      _id: confirmation.bookRequest,
      status: 'awaiting_confirmation',
    });

    if (!bookRequest) {
      return {
        handled: false,
        message: 'Book request is no longer awaiting confirmation',
      };
    }

    const transaction = await issueBookToStudent(
      {
        studentId: bookRequest.student.toString(),
        bookId: bookRequest.book.toString(),
        issuedBy: confirmation.initiatedBy.toString(),
        bookRequestId: bookRequest._id.toString(),
      },
      undefined
    );

    bookRequest.status = 'approved';
    bookRequest.approvedBy = confirmation.initiatedBy;
    bookRequest.remarks = confirmation.remarks;
    bookRequest.processedAt = new Date();
    await bookRequest.save();

    const student = await User.findById(bookRequest.student);
    const book = await Book.findById(bookRequest.book);

    if (student?.phone && book) {
      await sendBookApprovedWhatsApp({
        phone: student.phone,
        fullName: student.fullName,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookId: book.bookId,
        transactionId: transaction.transactionId,
        issueDate: new Date(transaction.issueDate),
        dueDate: new Date(transaction.dueDate),
      });
    }

    return {
      handled: true,
      type: 'book_issue' as const,
      accepted: true,
      message: 'Book issued after WhatsApp confirmation',
      transactionId: transaction.transactionId,
    };
  },

  declineBookIssue: async (confirmation: InstanceType<typeof WhatsAppConfirmation>) => {
    if (!confirmation.bookRequest) {
      return { handled: true, type: 'book_issue' as const, accepted: false, message: 'Declined' };
    }

    const bookRequest = await BookRequest.findOne({
      _id: confirmation.bookRequest,
      status: 'awaiting_confirmation',
    }).populate('book student');

    if (!bookRequest) {
      return {
        handled: true,
        type: 'book_issue' as const,
        accepted: false,
        message: 'Book request already updated',
      };
    }

    bookRequest.status = 'rejected';
    bookRequest.rejectedBy = confirmation.initiatedBy;
    bookRequest.remarks = 'Student declined WhatsApp confirmation';
    bookRequest.processedAt = new Date();
    await bookRequest.save();

    const student = bookRequest.student as unknown as InstanceType<typeof User>;
    const book = bookRequest.book as unknown as InstanceType<typeof Book>;

    if (student?.email && book?.title) {
      await sendBookRejectedEmail(
        student.email,
        student.fullName,
        book.title,
        'You declined the WhatsApp confirmation'
      );
      await createNotification({
        recipientId: student._id.toString(),
        type: 'book_rejected',
        title: 'Issue Cancelled',
        message: `You declined to receive "${book.title}". No borrow record was created.`,
        entityType: 'BookRequest',
        entityId: bookRequest._id.toString(),
      });
    }

    return {
      handled: true,
      type: 'book_issue' as const,
      accepted: false,
      message: 'No transaction saved — student declined on WhatsApp',
    };
  },

  /**
   * Pull poll votes from Wasender message info when webhooks never arrive.
   * Runs on admin list refresh and background jobs.
   */
  syncPendingPollVotesFromWasender: async (): Promise<number> => {
    if (!env.WASENDER_API_KEY) {
      return 0;
    }

    const pending = await WhatsAppConfirmation.find({
      type: 'book_request',
      status: 'pending',
      expiresAt: { $gt: new Date() },
      wasenderMsgId: { $exists: true, $nin: [null, ''] },
    })
      .sort({ createdAt: -1 })
      .limit(25);

    let synced = 0;

    for (const confirmation of pending) {
      const msgId = confirmation.wasenderMsgId?.trim();
      if (!msgId) continue;

      try {
        const info = await fetchWasenderMessageInfo(msgId);
        const vote = parsePollVoteFromMessageInfo(info, confirmation.phone);
        if (!vote) {
          continue;
        }

        const result = await whatsappConfirmationService.handlePollVote({
          accepted: vote.accepted,
          phone: confirmation.phone,
          msgId,
          pollKeyId: vote.pollKeyId ?? confirmation.wasenderPollKeyId,
        });

        if (result.handled) {
          console.log('[WhatsApp] Synced poll vote from Wasender API:', {
            msgId,
            accepted: vote.accepted,
            token: confirmation.token,
          });
          synced += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('404')) {
          console.warn('[WhatsApp] Poll vote sync failed:', { msgId, message });
        }
      }
    }

    return synced;
  },
};
