import { BookRequest } from '../models/BookRequest.model';
import { WhatsAppConfirmation } from '../models/WhatsAppConfirmation.model';

/** Waiting for student WhatsApp poll response. */
export const AWAITING_STUDENT_POLL_STATUSES = ['pending', 'pending_confirm'] as const;

export const ACTIVE_BOOK_REQUEST_STATUSES = [
  ...AWAITING_STUDENT_POLL_STATUSES,
  'confirmed',
  'awaiting_confirmation',
] as const;

const cancelPendingConfirmations = async (bookRequestId: string): Promise<void> => {
  await WhatsAppConfirmation.updateMany(
    {
      bookRequest: bookRequestId,
      status: 'pending',
    },
    {
      $set: {
        status: 'declined',
        respondedAt: new Date(),
      },
    }
  );
};

const isAwaitingStudentPoll = (status: string): boolean =>
  (AWAITING_STUDENT_POLL_STATUSES as readonly string[]).includes(status);

const linkConfirmationToRequest = async (
  confirmation: InstanceType<typeof WhatsAppConfirmation>,
  bookRequest: InstanceType<typeof BookRequest>
) => {
  if (confirmation.bookRequest?.toString() === bookRequest._id.toString()) {
    return confirmation;
  }
  confirmation.bookRequest = bookRequest._id;
  await confirmation.save();
  return confirmation;
};

/** Find the WhatsApp confirmation that belongs to this book request (not an older one). */
const findLinkedBookRequestConfirmation = async (
  bookRequest: InstanceType<typeof BookRequest>
) => {
  const byRequest = await WhatsAppConfirmation.findOne({
    bookRequest: bookRequest._id,
    type: 'book_request',
  }).sort({ createdAt: -1 });

  if (byRequest) return byRequest;

  const pending = await WhatsAppConfirmation.findOne({
    student: bookRequest.student,
    book: bookRequest.book,
    type: 'book_request',
    status: 'pending',
    expiresAt: { $gt: new Date() },
    createdAt: { $gte: bookRequest.createdAt },
  }).sort({ createdAt: -1 });

  if (pending) {
    return linkConfirmationToRequest(pending, bookRequest);
  }

  const responded = await WhatsAppConfirmation.findOne({
    student: bookRequest.student,
    book: bookRequest.book,
    type: 'book_request',
    status: { $in: ['confirmed', 'declined'] },
    respondedAt: { $gte: bookRequest.createdAt },
  }).sort({ respondedAt: -1 });

  if (responded) {
    return linkConfirmationToRequest(responded, bookRequest);
  }

  return null;
};

/** Restore requests wrongly canceled by stale WhatsApp sync while a poll is still pending. */
export const repairWronglyCanceledBookRequests = async (): Promise<number> => {
  const wronglyCanceled = await BookRequest.find({
    status: 'canceled',
    remarks: 'Cancelled via WhatsApp',
  });

  let fixed = 0;

  for (const bookRequest of wronglyCanceled) {
    const pendingConfirmation = await WhatsAppConfirmation.findOne({
      bookRequest: bookRequest._id,
      type: 'book_request',
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!pendingConfirmation) continue;

    bookRequest.status = 'pending';
    bookRequest.remarks = undefined;
    bookRequest.processedAt = undefined;
    await bookRequest.save();
    fixed += 1;
  }

  return fixed;
};

/** Point pending WhatsApp confirmations at the active pending book request for the same student+book. */
export const repairPollConfirmationLinks = async (): Promise<number> => {
  const pendingConfirmations = await WhatsAppConfirmation.find({
    type: 'book_request',
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });

  let fixed = 0;

  for (const confirmation of pendingConfirmations) {
    const activeRequest = await BookRequest.findOne({
      student: confirmation.student,
      book: confirmation.book,
      status: { $in: AWAITING_STUDENT_POLL_STATUSES },
    }).sort({ createdAt: -1 });

    if (!activeRequest) continue;
    if (activeRequest.createdAt > confirmation.createdAt) {
      await linkConfirmationToRequest(confirmation, activeRequest);
      fixed += 1;
      continue;
    }

    const linkedId = confirmation.bookRequest?.toString();
    if (linkedId === activeRequest._id.toString()) continue;

    const linkedRequest = linkedId ? await BookRequest.findById(linkedId) : null;
    if (linkedRequest && isAwaitingStudentPoll(linkedRequest.status)) continue;

    await linkConfirmationToRequest(confirmation, activeRequest);
    fixed += 1;
  }

  return fixed;
};

/** Sync book request status from its own WhatsApp confirmation (not old ones). */
export const syncConfirmedBookRequestsFromWhatsApp = async (options?: {
  studentId?: string;
  bookId?: string;
}): Promise<number> => {
  const filter: Record<string, unknown> = {
    status: { $in: AWAITING_STUDENT_POLL_STATUSES },
  };

  if (options?.studentId) {
    filter.student = options.studentId;
  }
  if (options?.bookId) {
    filter.book = options.bookId;
  }

  const awaitingRequests = await BookRequest.find(filter);
  let fixed = 0;

  for (const bookRequest of awaitingRequests) {
    const confirmation = await findLinkedBookRequestConfirmation(bookRequest);
    if (!confirmation) continue;

    if (confirmation.status === 'confirmed') {
      bookRequest.status = 'confirmed';
      bookRequest.remarks = undefined;
      bookRequest.processedAt = undefined;
      bookRequest.rejectedBy = undefined;
      await bookRequest.save();
      fixed += 1;
      continue;
    }

    if (confirmation.status === 'declined') {
      bookRequest.status = 'canceled';
      bookRequest.remarks = bookRequest.remarks || 'Cancelled via WhatsApp';
      bookRequest.processedAt = bookRequest.processedAt || new Date();
      await bookRequest.save();
      fixed += 1;
    }
  }

  return fixed;
};

/** Apply confirmed/declined WhatsApp records to book requests still awaiting a poll. */
export const syncRespondedConfirmationsToBookRequests = async (): Promise<number> => {
  const responded = await WhatsAppConfirmation.find({
    type: 'book_request',
    status: { $in: ['confirmed', 'declined'] },
    bookRequest: { $exists: true, $ne: null },
  }).sort({ respondedAt: -1 });

  let fixed = 0;

  for (const confirmation of responded) {
    const bookRequest = await BookRequest.findById(confirmation.bookRequest);
    if (!bookRequest || !isAwaitingStudentPoll(bookRequest.status)) {
      continue;
    }

    if (confirmation.status === 'confirmed') {
      bookRequest.status = 'confirmed';
      bookRequest.remarks = undefined;
      bookRequest.processedAt = undefined;
      bookRequest.rejectedBy = undefined;
      await bookRequest.save();
      fixed += 1;
      continue;
    }

    bookRequest.status = 'canceled';
    bookRequest.remarks = bookRequest.remarks || 'Cancelled via WhatsApp';
    bookRequest.processedAt = bookRequest.processedAt || confirmation.respondedAt || new Date();
    await bookRequest.save();
    fixed += 1;
  }

  return fixed;
};

/** Fix one request stuck awaiting student poll or librarian issue confirmation. */
export const reconcileBookRequest = async (
  bookRequest: InstanceType<typeof BookRequest>
): Promise<InstanceType<typeof BookRequest>> => {
  if (isAwaitingStudentPoll(bookRequest.status)) {
    const confirmation = await findLinkedBookRequestConfirmation(bookRequest);

    if (!confirmation) {
      return bookRequest;
    }

    if (confirmation.status === 'confirmed') {
      bookRequest.status = 'confirmed';
      bookRequest.remarks = undefined;
      bookRequest.processedAt = undefined;
      await bookRequest.save();
      return bookRequest;
    }

    if (confirmation.status === 'declined') {
      bookRequest.status = 'canceled';
      bookRequest.remarks = bookRequest.remarks || 'Cancelled via WhatsApp';
      bookRequest.processedAt = bookRequest.processedAt || new Date();
      await bookRequest.save();
      return bookRequest;
    }

    if (confirmation.status === 'pending' && confirmation.expiresAt > new Date()) {
      return bookRequest;
    }

    if (confirmation.status === 'pending' && confirmation.expiresAt <= new Date()) {
      confirmation.status = 'expired';
      confirmation.respondedAt = new Date();
      await confirmation.save();
      bookRequest.status = 'canceled';
      bookRequest.remarks = bookRequest.remarks || 'WhatsApp confirmation expired';
      bookRequest.processedAt = bookRequest.processedAt || new Date();
      await bookRequest.save();
    }

    return bookRequest;
  }

  if (bookRequest.status === 'awaiting_confirmation') {
    const confirmation = await WhatsAppConfirmation.findOne({
      bookRequest: bookRequest._id,
      type: 'book_issue',
      status: 'pending',
    });

    if (!confirmation) {
      bookRequest.status = 'confirmed';
      await bookRequest.save();
      return bookRequest;
    }

    if (confirmation.expiresAt <= new Date()) {
      confirmation.status = 'expired';
      confirmation.respondedAt = new Date();
      await confirmation.save();
      bookRequest.status = 'confirmed';
      await bookRequest.save();
    }
  }

  return bookRequest;
};

export const reconcileActiveBookRequests = async (options?: {
  studentId?: string;
  bookId?: string;
}): Promise<number> => {
  const restored = await repairWronglyCanceledBookRequests();
  const linked = await repairPollConfirmationLinks();
  const syncedFromPending = await syncConfirmedBookRequestsFromWhatsApp(options);
  const syncedFromResponded = await syncRespondedConfirmationsToBookRequests();

  const filter: Record<string, unknown> = {
    status: { $in: ACTIVE_BOOK_REQUEST_STATUSES },
  };

  if (options?.studentId) {
    filter.student = options.studentId;
  }
  if (options?.bookId) {
    filter.book = options.bookId;
  }

  const activeRequests = await BookRequest.find(filter);
  let changed = 0;

  for (const request of activeRequests) {
    const before = request.status;
    await reconcileBookRequest(request);
    if (request.status !== before) {
      changed += 1;
    }
  }

  return changed + syncedFromPending + syncedFromResponded + linked + restored;
};

export const cancelPendingConfirmationsForRequest = cancelPendingConfirmations;
