import { Request, Response, NextFunction } from 'express';
import Newsletter from '../models/Newsletter';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

export const subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      if (existing.isSubscribed) { sendError(res, 'Already subscribed', 400); return; }
      existing.isSubscribed = true;
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = undefined;
      await existing.save();
      sendSuccess(res, 'Resubscribed successfully');
      return;
    }

    await Newsletter.create({ email });
    sendSuccess(res, 'Subscribed successfully', null, 201);
  } catch (err) {
    next(err);
  }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const subscriber = await Newsletter.findOneAndUpdate(
      { email },
      { isSubscribed: false, unsubscribedAt: new Date() },
      { new: true }
    );
    if (!subscriber) { sendError(res, 'Email not found', 404); return; }
    sendSuccess(res, 'Unsubscribed successfully');
  } catch (err) {
    next(err);
  }
};

export const getSubscribers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [subscribers, total] = await Promise.all([
      Newsletter.find({ isSubscribed: true }).sort('-subscribedAt').skip(skip).limit(l).lean(),
      Newsletter.countDocuments({ isSubscribed: true }),
    ]);

    sendSuccess(res, 'Subscribers fetched', subscribers, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};
