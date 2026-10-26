import { Request } from 'express';
import { AuditLog } from '../models/AuditLog.model';

export const createAuditLog = async (
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  try {
    await AuditLog.create({
      user: req.user?.id,
      action,
      entity,
      entityId,
      metadata,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
