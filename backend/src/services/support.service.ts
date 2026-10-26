import fs from 'fs/promises';
import path from 'path';
import mongoose, { FilterQuery } from 'mongoose';
import {
  SupportRequest,
  ISupportRequest,
  ISupportAttachment,
} from '../models/SupportRequest.model';
import {
  SupportRequestTimeline,
  TimelineAction,
} from '../models/SupportRequestTimeline.model';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { generateSequentialId } from '../utils/generateId';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { createAuditLog } from './audit.service';
import { createNotification } from './notification.service';
import { sendSupportUpdateEmail } from './email.service';
import { uploadToCloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { AuthRequest } from '../types/express.d';
import {
  ListSupportQuery,
  CreateSupportInput,
  AssignSupportInput,
  UpdateSupportStatusInput,
  AddCommentInput,
  ResolveSupportInput,
  ReopenSupportInput,
} from '../validators/support.validator';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'support');

const populateFields = [
  { path: 'student', select: 'fullName email studentProfile status' },
  { path: 'assignedTo', select: 'fullName email role' },
  { path: 'resolvedBy', select: 'fullName role' },
];

const sanitizeTimeline = (item: any) => {
  const obj = item.toObject ? item.toObject({ virtuals: true }) : item;
  return {
    id: obj._id?.toString(),
    action: obj.action,
    performedBy: obj.performedBy,
    previousStatus: obj.previousStatus,
    newStatus: obj.newStatus,
    notes: obj.notes,
    timestamp: obj.timestamp,
  };
};

const sanitizeTicket = (item: any) => {
  const obj = item.toObject ? item.toObject({ virtuals: true }) : item;
  return {
    id: obj._id?.toString(),
    requestId: obj.requestId,
    student: obj.student,
    subject: obj.subject,
    category: obj.category,
    description: obj.description,
    attachment: obj.attachment,
    priority: obj.priority,
    status: obj.status,
    assignedTo: obj.assignedTo,
    resolvedAt: obj.resolvedAt,
    resolvedBy: obj.resolvedBy,
    resolutionNotes: obj.resolutionNotes,
    submittedDate: obj.submittedDate,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const addTimelineEntry = async (params: {
  supportRequestId: string;
  action: TimelineAction;
  performedBy: string;
  previousStatus?: string;
  newStatus?: string;
  notes?: string;
}) => {
  await SupportRequestTimeline.create({
    supportRequest: params.supportRequestId,
    action: params.action,
    performedBy: params.performedBy,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    notes: params.notes,
    timestamp: new Date(),
  });
};

const getTicketOrThrow = async (id: string): Promise<ISupportRequest> => {
  const ticket = await SupportRequest.findById(id);
  if (!ticket) throw ApiError.notFound('Support ticket not found');
  return ticket;
};

const assertCanAccessTicket = (ticket: ISupportRequest, req: AuthRequest) => {
  if (req.user.role === 'student' && ticket.student.toString() !== req.user.id) {
    throw ApiError.forbidden('You can only access your own support tickets');
  }
};

const notifyStudent = async (
  ticket: ISupportRequest,
  title: string,
  message: string
) => {
  await createNotification({
    recipientId: ticket.student.toString(),
    type: 'support_update',
    title,
    message,
    entityType: 'SupportRequest',
    entityId: ticket._id.toString(),
  });
};

const emailStudentIfPossible = async (
  ticket: ISupportRequest,
  statusLabel: string,
  notes?: string
) => {
  const student = await User.findById(ticket.student);
  if (student?.email) {
    await sendSupportUpdateEmail(
      student.email,
      student.fullName,
      ticket.requestId,
      ticket.subject,
      statusLabel,
      notes
    );
  }
};

const saveAttachment = async (
  file: Express.Multer.File
): Promise<ISupportAttachment> => {
  if (isCloudinaryConfigured) {
    const result = await uploadToCloudinary(file.buffer, 'lms/support', 'auto');
    return {
      url: result.url,
      publicId: result.publicId,
      filename: file.originalname,
    };
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalname) || '.bin';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return {
    url: `/uploads/support/${filename}`,
    filename: file.originalname,
  };
};

export const supportService = {
  list: async (query: ListSupportQuery, req: AuthRequest) => {
    const { skip, limit, page, sort } = parsePagination(query);
    const filter: FilterQuery<ISupportRequest> = {};

    if (req.user.role === 'student') {
      filter.student = req.user.id;
    } else {
      if (query.studentId) filter.student = query.studentId;
      if (query.assignedTo) filter.assignedTo = query.assignedTo;
    }

    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.priority) filter.priority = query.priority;

    const [tickets, total] = await Promise.all([
      SupportRequest.find(filter).populate(populateFields).sort(sort).skip(skip).limit(limit),
      SupportRequest.countDocuments(filter),
    ]);

    return {
      tickets: tickets.map((t) => sanitizeTicket(t)),
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  getById: async (id: string, req: AuthRequest) => {
    const ticket = await SupportRequest.findById(id).populate(populateFields);
    if (!ticket) throw ApiError.notFound('Support ticket not found');
    assertCanAccessTicket(ticket, req);

    const timeline = await SupportRequestTimeline.find({ supportRequest: id })
      .populate({ path: 'performedBy', select: 'fullName role' })
      .sort({ timestamp: 1 });

    return {
      ticket: sanitizeTicket(ticket),
      timeline: timeline.map((t) => sanitizeTimeline(t)),
    };
  },

  create: async (
    input: CreateSupportInput,
    req: AuthRequest,
    file?: Express.Multer.File
  ) => {
    const requestId = await generateSequentialId('SUP', SupportRequest, 'requestId');
    let attachment: ISupportAttachment | undefined;

    if (file) {
      attachment = await saveAttachment(file);
    }

    const ticket = await SupportRequest.create({
      requestId,
      student: req.user.id,
      subject: input.subject,
      category: input.category,
      description: input.description,
      priority: input.priority,
      attachment,
      status: 'open',
      submittedDate: new Date(),
    });

    await addTimelineEntry({
      supportRequestId: ticket._id.toString(),
      action: 'created',
      performedBy: req.user.id,
      newStatus: 'open',
      notes: input.description,
    });

    await createAuditLog(req, 'support.create', 'SupportRequest', ticket._id.toString());

    const populated = await SupportRequest.findById(ticket._id).populate(populateFields);
    return sanitizeTicket(populated!);
  },

  assign: async (id: string, input: AssignSupportInput, req: AuthRequest) => {
    const ticket = await getTicketOrThrow(id);
    const assignee = await User.findOne({
      _id: input.assignedTo,
      role: { $in: ['admin', 'librarian'] },
      deletedAt: { $exists: false },
    });

    if (!assignee) throw ApiError.notFound('Assignee not found');

    const previousStatus = ticket.status;
    ticket.assignedTo = assignee._id;
    if (ticket.status === 'open') {
      ticket.status = 'under_review';
    }
    await ticket.save();

    await addTimelineEntry({
      supportRequestId: id,
      action: 'assigned',
      performedBy: req.user.id,
      previousStatus,
      newStatus: ticket.status,
      notes: `Assigned to ${assignee.fullName}`,
    });

    await notifyStudent(
      ticket,
      'Support Ticket Assigned',
      `Your ticket ${ticket.requestId} has been assigned for review.`
    );
    await emailStudentIfPossible(ticket, 'Under Review', `Assigned to ${assignee.fullName}`);

    await createAuditLog(req, 'support.assign', 'SupportRequest', id, {
      assignedTo: input.assignedTo,
    });

    const populated = await SupportRequest.findById(id).populate(populateFields);
    return sanitizeTicket(populated!);
  },

  updateStatus: async (id: string, input: UpdateSupportStatusInput, req: AuthRequest) => {
    const ticket = await getTicketOrThrow(id);
    const previousStatus = ticket.status;

    if (['resolved', 'rejected'].includes(previousStatus)) {
      throw ApiError.badRequest('Use reopen to change a closed ticket');
    }

    ticket.status = input.status;
    await ticket.save();

    await addTimelineEntry({
      supportRequestId: id,
      action: 'status_changed',
      performedBy: req.user.id,
      previousStatus,
      newStatus: input.status,
      notes: input.notes,
    });

    await notifyStudent(
      ticket,
      'Support Ticket Updated',
      `Ticket ${ticket.requestId} status changed to ${input.status.replace(/_/g, ' ')}.`
    );
    await emailStudentIfPossible(ticket, input.status.replace(/_/g, ' '), input.notes);

    await createAuditLog(req, 'support.status', 'SupportRequest', id, {
      previousStatus,
      newStatus: input.status,
    });

    const populated = await SupportRequest.findById(id).populate(populateFields);
    return sanitizeTicket(populated!);
  },

  addComment: async (id: string, input: AddCommentInput, req: AuthRequest) => {
    const ticket = await getTicketOrThrow(id);
    assertCanAccessTicket(ticket, req);

    if (req.user.role === 'student') {
      if (!['open', 'waiting_for_student', 'under_review'].includes(ticket.status)) {
        throw ApiError.badRequest('You cannot comment on this ticket in its current status');
      }
    }

    await addTimelineEntry({
      supportRequestId: id,
      action: 'comment',
      performedBy: req.user.id,
      notes: input.notes,
    });

    if (req.user.role !== 'student') {
      ticket.status = 'waiting_for_student';
      await ticket.save();
      await notifyStudent(
        ticket,
        'New Response on Support Ticket',
        `Staff replied on ticket ${ticket.requestId}.`
      );
      await emailStudentIfPossible(ticket, 'Waiting for Student', input.notes);
    } else if (ticket.status === 'waiting_for_student') {
      ticket.status = 'under_review';
      await ticket.save();
    }

    await createAuditLog(req, 'support.comment', 'SupportRequest', id);

    const populated = await SupportRequest.findById(id).populate(populateFields);
    return sanitizeTicket(populated!);
  },

  resolve: async (id: string, input: ResolveSupportInput, req: AuthRequest) => {
    const ticket = await getTicketOrThrow(id);

    if (['resolved', 'rejected'].includes(ticket.status)) {
      throw ApiError.badRequest('Ticket is already closed');
    }

    const previousStatus = ticket.status;
    ticket.status = input.status;
    ticket.resolutionNotes = input.resolutionNotes;
    ticket.resolvedAt = new Date();
    ticket.resolvedBy = new mongoose.Types.ObjectId(req.user.id);
    await ticket.save();

    await addTimelineEntry({
      supportRequestId: id,
      action: 'resolved',
      performedBy: req.user.id,
      previousStatus,
      newStatus: input.status,
      notes: input.resolutionNotes,
    });

    const statusLabel = input.status === 'resolved' ? 'Resolved' : 'Rejected';
    await notifyStudent(
      ticket,
      `Support Ticket ${statusLabel}`,
      `Ticket ${ticket.requestId} has been ${input.status}.`
    );
    await emailStudentIfPossible(ticket, statusLabel, input.resolutionNotes);

    await createAuditLog(req, 'support.resolve', 'SupportRequest', id, {
      status: input.status,
    });

    const populated = await SupportRequest.findById(id).populate(populateFields);
    return sanitizeTicket(populated!);
  },

  reopen: async (id: string, input: ReopenSupportInput, req: AuthRequest) => {
    const ticket = await getTicketOrThrow(id);

    if (!['resolved', 'rejected'].includes(ticket.status)) {
      throw ApiError.badRequest('Only closed tickets can be reopened');
    }

    const previousStatus = ticket.status;
    ticket.status = 'under_review';
    ticket.resolvedAt = undefined;
    ticket.resolvedBy = undefined;
    ticket.resolutionNotes = undefined;
    await ticket.save();

    await addTimelineEntry({
      supportRequestId: id,
      action: 'reopened',
      performedBy: req.user.id,
      previousStatus,
      newStatus: 'under_review',
      notes: input.notes,
    });

    await notifyStudent(
      ticket,
      'Support Ticket Reopened',
      `Ticket ${ticket.requestId} has been reopened for review.`
    );
    await emailStudentIfPossible(ticket, 'Under Review', input.notes);

    await createAuditLog(req, 'support.reopen', 'SupportRequest', id);

    const populated = await SupportRequest.findById(id).populate(populateFields);
    return sanitizeTicket(populated!);
  },

  getSummary: async (req: AuthRequest) => {
    const filter: FilterQuery<ISupportRequest> =
      req.user.role === 'student' ? { student: req.user.id } : {};

    const [open, underReview, waiting, resolved, rejected] = await Promise.all([
      SupportRequest.countDocuments({ ...filter, status: 'open' }),
      SupportRequest.countDocuments({ ...filter, status: 'under_review' }),
      SupportRequest.countDocuments({ ...filter, status: 'waiting_for_student' }),
      SupportRequest.countDocuments({ ...filter, status: 'resolved' }),
      SupportRequest.countDocuments({ ...filter, status: 'rejected' }),
    ]);

    return { open, underReview, waiting, resolved, rejected, total: open + underReview + waiting + resolved + rejected };
  },
};
