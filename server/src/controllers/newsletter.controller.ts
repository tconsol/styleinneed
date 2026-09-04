import { Request, Response, NextFunction } from 'express';
import Newsletter from '../models/Newsletter';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { sendPromotionEmail, PromotionEmail } from '../services/email.service';
import { primaryClientUrl } from '../middleware/security';
import { getAppearance } from './settings.controller';
import logger from '../utils/logger';

// Resolve a CTA target (a relative path like "/sale", or an already-absolute
// URL) against the storefront's CLIENT_URL so links in emails always work
// regardless of what the admin typed/picked.
const resolveUrl = (base: string, target: string): string =>
  /^https?:\/\//i.test(target) ? target : `${base}${target.startsWith('/') ? '' : '/'}${target}`;

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

// Send a promotional email to selected newsletter subscribers (or all of them).
// Only addresses that are actually subscribed are mailed — the client selection
// is intersected with the live subscriber list to prevent arbitrary sends.
export const broadcastPromotion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { emails, all, promotion } = req.body as {
      emails?: string[];
      all?: boolean;
      promotion?: {
        title?: string;
        description?: string;
        discountType?: 'percentage' | 'fixed';
        discountValue?: number;
        discountLabel?: string;
        badgeText?: string;
        bannerImage?: string;
        code?: string;
        ctaUrl?: string;
        ctaText?: string;
      };
    };

    if (!promotion?.title) { sendError(res, 'Promotion title is required', 400); return; }

    // Authoritative subscriber list.
    const subscribed = await Newsletter.find({ isSubscribed: true }).select('email').lean();
    const subscribedSet = new Set(subscribed.map((s) => s.email.toLowerCase()));

    let targets: string[];
    if (all) {
      targets = [...subscribedSet];
    } else {
      const requested = (emails || []).map((e) => e.toLowerCase().trim()).filter(Boolean);
      targets = requested.filter((e) => subscribedSet.has(e));
    }

    if (targets.length === 0) { sendError(res, 'No subscribed recipients selected', 400); return; }

    const discountLabel =
      promotion.discountLabel ||
      (promotion.discountValue != null
        ? promotion.discountType === 'fixed'
          ? `₹${promotion.discountValue} OFF`
          : `${promotion.discountValue}% OFF`
        : undefined);

    const base = primaryClientUrl();
    const appearance = await getAppearance();
    const build = (email: string): PromotionEmail => ({
      title: promotion.title!,
      description: promotion.description,
      discountLabel,
      badgeText: promotion.badgeText,
      bannerImage: promotion.bannerImage,
      code: promotion.code,
      ctaUrl: resolveUrl(base, promotion.ctaUrl || '/sale'),
      ctaText: promotion.ctaText,
      unsubscribeUrl: `${base}/unsubscribe?email=${encodeURIComponent(email)}`,
      theme: {
        primary: appearance.primary,
        primaryDark: appearance.primaryDark,
        bg: appearance.bg,
        surface: appearance.surface,
        text: appearance.text,
        muted: appearance.muted,
        border: appearance.border,
      },
    });

    // Send in small batches so a large list doesn't overwhelm the SMTP relay.
    let sent = 0;
    let failed = 0;
    const BATCH = 20;
    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const results = await Promise.allSettled(chunk.map((e) => sendPromotionEmail(e, build(e))));
      results.forEach((r) => (r.status === 'fulfilled' ? sent++ : failed++));
    }

    logger.info(`Promotion broadcast: ${sent} sent, ${failed} failed of ${targets.length}`);
    sendSuccess(res, `Sent to ${sent} subscriber(s)${failed ? `, ${failed} failed` : ''}`, { sent, failed, total: targets.length });
  } catch (err) {
    next(err);
  }
};

export const getSubscribers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, status, search } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (status === 'subscribed') filter.isSubscribed = true;
    else if (status === 'unsubscribed') filter.isSubscribed = false;
    // status === 'all' (or omitted) -> no filter, both included
    if (search) filter.email = { $regex: search, $options: 'i' };

    const [subscribers, total] = await Promise.all([
      Newsletter.find(filter).sort('-createdAt').skip(skip).limit(l).lean(),
      Newsletter.countDocuments(filter),
    ]);

    sendSuccess(res, 'Subscribers fetched', subscribers, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const deleteSubscriber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sub = await Newsletter.findByIdAndDelete(req.params.id);
    if (!sub) { sendError(res, 'Subscriber not found', 404); return; }
    sendSuccess(res, 'Subscriber deleted');
  } catch (err) {
    next(err);
  }
};
