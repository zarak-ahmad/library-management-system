import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/Notification.model';

export const createNotification = async (params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> => {
  await Notification.create({
    recipient: params.recipientId,
    type: params.type,
    title: params.title,
    message: params.message,
    entityType: params.entityType,
    entityId: params.entityId ? new mongoose.Types.ObjectId(params.entityId) : undefined,
  });
};

export const notificationService = {
  list: async (userId: string, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return {
      notifications: items.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        entityType: n.entityType,
        entityId: n.entityId?.toString(),
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      unreadCount,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  markRead: async (userId: string, notificationId: string) => {
    const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
    if (!notification) return null;
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    return notification;
  },

  markAllRead: async (userId: string) => {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  },

  getUnreadCount: async (userId: string) => {
    return Notification.countDocuments({ recipient: userId, isRead: false });
  },
};
