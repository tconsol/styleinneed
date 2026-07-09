import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import Notification from '../models/Notification';
import User from '../models/User';
import { sendBroadcastPush } from '../services/push.service';
import type { NotificationType } from '../models/Notification';

export const registerPushToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.length < 20) {
      sendError(res, 'Invalid push token', 400);
      return;
    }
    await User.findByIdAndUpdate(req.user!._id, { pushToken: token });
    sendSuccess(res, 'Push token registered');
  } catch (err) {
    next(err);
  }
};

export const removePushToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.user!._id, { $unset: { pushToken: 1 } });
    sendSuccess(res, 'Push token removed');
  } catch (err) {
    next(err);
  }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user!._id }).sort('-createdAt').skip(skip).limit(l).lean(),
      Notification.countDocuments({ user: req.user!._id }),
      Notification.countDocuments({ user: req.user!._id, isRead: false }),
    ]);

    sendSuccess(res, 'Notifications fetched', { items: notifications, unreadCount }, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      { isRead: true },
      { new: true }
    );
    if (!result) { sendError(res, 'Notification not found', 404); return; }
    sendSuccess(res, 'Marked as read');
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Notification.updateMany({ user: req.user!._id, isRead: false }, { isRead: true });
    sendSuccess(res, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

export const broadcastPush = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, body, type = 'general', deepLink } = req.body as {
      title: string; body: string; type?: NotificationType; deepLink?: string;
    };

    if (!title?.trim() || !body?.trim()) {
      sendError(res, 'title and body are required', 400);
      return;
    }

    const result = await sendBroadcastPush({ title, body, type, deepLink });
    sendSuccess(res, `Broadcast sent: ${result.sent} delivered, ${result.failed} failed`, result);
  } catch (err) {
    next(err);
  }
};

export const getBroadcastStats = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [total, withToken] = await Promise.all([
      (await import('../models/User')).default.countDocuments({ isActive: true }),
      (await import('../models/User')).default.countDocuments({ pushToken: { $exists: true, $ne: '' } }),
    ]);
    sendSuccess(res, 'Stats fetched', { totalUsers: total, registeredDevices: withToken });
  } catch (err) {
    next(err);
  }
};
