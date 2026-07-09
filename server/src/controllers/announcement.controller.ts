import { Request, Response, NextFunction } from 'express';
import Announcement from '../models/Announcement';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

export const getActiveAnnouncements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type } = req.query as Record<string, string>;
    const now = new Date();

    const filter: Record<string, unknown> = {
      isActive: true,
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    };
    if (type) filter.type = type;

    const announcements = await Announcement.find(filter).sort('-createdAt').lean();
    sendSuccess(res, 'Active announcements', announcements);
  } catch (err) {
    next(err);
  }
};

export const trackAnnouncementClick = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    sendSuccess(res, 'Click tracked');
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const announcement = await Announcement.create(req.body);
    sendSuccess(res, 'Announcement created', announcement, 201);
  } catch (err) {
    next(err);
  }
};

export const updateAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!announcement) { sendError(res, 'Announcement not found', 404); return; }
    sendSuccess(res, 'Announcement updated', announcement);
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Announcement deleted');
  } catch (err) {
    next(err);
  }
};

export const getAnnouncements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [announcements, total] = await Promise.all([
      Announcement.find().sort('-createdAt').skip(skip).limit(l).lean(),
      Announcement.countDocuments(),
    ]);

    sendSuccess(res, 'Announcements fetched', announcements, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};
