import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Order from '../models/Order';
import Newsletter from '../models/Newsletter';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { sendPromotionEmail, PromotionEmail } from '../services/email.service';
import { primaryClientUrl } from '../middleware/security';
import { getAppearance } from './settings.controller';
import logger from '../utils/logger';

export type AudienceSource = 'registrations' | 'orders' | 'newsletter';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (e?: string | null): string | null => {
  const v = String(e || '').toLowerCase().trim();
  return EMAIL_RE.test(v) ? v : null;
};

interface AudienceEntry {
  email: string;
  sources: AudienceSource[];
}

/**
 * Collect every address we hold, tagged with where it came from.
 *
 * Addresses are lower-cased and de-duplicated across all three sources, so a
 * customer who registered, ordered and subscribed counts once — with all three
 * sources recorded against them.
 *
 * Anyone who has explicitly unsubscribed is removed entirely, whichever source
 * they appear in. Having someone's address from an order is not consent to
 * keep marketing to them after they've opted out.
 */
const buildAudience = async () => {
  const [registered, orders, subscribers, optedOut] = await Promise.all([
    User.find({ role: 'customer', isGuest: { $ne: true } }).select('email').lean(),
    Order.find().select('shippingAddress.email user').populate('user', 'email').limit(50_000).lean(),
    Newsletter.find({ isSubscribed: true }).select('email').lean(),
    Newsletter.find({ isSubscribed: false }).select('email').lean(),
  ]);

  const suppressed = new Set(optedOut.map((n) => clean(n.email)).filter(Boolean) as string[]);
  const map = new Map<string, Set<AudienceSource>>();

  const add = (raw: string | null | undefined, source: AudienceSource) => {
    const email = clean(raw);
    if (!email || suppressed.has(email)) return;
    const set = map.get(email) || new Set<AudienceSource>();
    set.add(source);
    map.set(email, set);
  };

  registered.forEach((u) => add(u.email, 'registrations'));
  subscribers.forEach((n) => add(n.email, 'newsletter'));
  orders.forEach((o) => {
    add(o.shippingAddress?.email, 'orders');
    add((o.user as unknown as { email?: string } | null)?.email, 'orders');
  });

  const entries: AudienceEntry[] = [...map.entries()]
    .map(([email, sources]) => ({ email, sources: [...sources] }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const countBy = (s: AudienceSource) => entries.filter((e) => e.sources.includes(s)).length;

  return {
    entries,
    stats: {
      registrations: countBy('registrations'),
      orders: countBy('orders'),
      newsletter: countBy('newsletter'),
      /** Unique addresses after merging all three. */
      total: entries.length,
      /** Present in more than one source — the overlap the raw counts hide. */
      inMultipleSources: entries.filter((e) => e.sources.length > 1).length,
      /** Held but excluded because they opted out. */
      unsubscribed: suppressed.size,
    },
  };
};

/** Admin: the deduplicated audience plus a per-source breakdown. */
export const getAudience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entries, stats } = await buildAudience();

    // `sources` filters the returned list; the stats always describe everything.
    const wanted = String(req.query.sources || '')
      .split(',').map((s) => s.trim()).filter(Boolean) as AudienceSource[];

    const list = wanted.length
      ? entries.filter((e) => e.sources.some((s) => wanted.includes(s)))
      : entries;

    sendSuccess(res, 'Audience', {
      stats,
      selected: list.length,
      // Capped so a very large audience can't blow up the response; the stats
      // and the send itself still cover everyone.
      contacts: list.slice(0, 5000),
      truncated: list.length > 5000,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: send a campaign.
 *
 * Recipients are always re-derived from the live audience and intersected with
 * whatever the client asked for, so a stale page can't mail someone who has
 * since unsubscribed, and arbitrary addresses can't be injected.
 */
export const sendCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, sources, emails, campaign } = req.body as {
      subject?: string;
      sources?: AudienceSource[];
      emails?: string[];
      campaign?: {
        title?: string; description?: string; bannerImage?: string;
        badgeText?: string; ctaUrl?: string; ctaText?: string; discountLabel?: string;
      };
    };

    if (!campaign?.title?.trim()) { sendError(res, 'A campaign heading is required', 400); return; }

    const { entries } = await buildAudience();
    const allowed = new Map(entries.map((e) => [e.email, e]));

    let targets: string[];
    if (emails?.length) {
      targets = emails
        .map((e) => clean(e))
        .filter((e): e is string => !!e && allowed.has(e));
    } else {
      const wanted = sources?.length ? sources : (['registrations', 'orders', 'newsletter'] as AudienceSource[]);
      targets = entries.filter((e) => e.sources.some((s) => wanted.includes(s))).map((e) => e.email);
    }

    if (targets.length === 0) { sendError(res, 'No eligible recipients for that selection', 400); return; }

    const base = primaryClientUrl();
    const appearance = await getAppearance();
    const resolveUrl = (t: string) => (/^https?:\/\//i.test(t) ? t : `${base}${t.startsWith('/') ? '' : '/'}${t}`);

    const build = (email: string): PromotionEmail => ({
      title: campaign.title!,
      description: campaign.description,
      discountLabel: campaign.discountLabel,
      badgeText: campaign.badgeText,
      bannerImage: campaign.bannerImage,
      ctaUrl: resolveUrl(campaign.ctaUrl || '/products'),
      ctaText: campaign.ctaText,
      unsubscribeUrl: `${base}/unsubscribe?email=${encodeURIComponent(email)}`,
      theme: {
        primary: appearance.primary, primaryDark: appearance.primaryDark,
        bg: appearance.bg, surface: appearance.surface,
        text: appearance.text, muted: appearance.muted, border: appearance.border,
      },
    });

    let sent = 0;
    let failed = 0;
    const BATCH = 20;
    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        chunk.map((e) => sendPromotionEmail(e, { ...build(e), title: subject?.trim() || campaign.title! }))
      );
      results.forEach((r) => (r.status === 'fulfilled' ? sent++ : failed++));
    }

    await AuditLog.create({
      user: req.user!._id,
      action: 'SEND_EMAIL_CAMPAIGN',
      resource: 'campaign',
      changes: { subject: subject || campaign.title, recipients: targets.length, sent, failed },
    });

    logger.info(`Email campaign: ${sent} sent, ${failed} failed of ${targets.length}`);
    sendSuccess(res, `Sent to ${sent} recipient(s)${failed ? `, ${failed} failed` : ''}`, {
      sent, failed, total: targets.length,
    });
  } catch (err) {
    next(err);
  }
};

/** Admin: download the deduplicated audience. */
export const exportAudience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entries } = await buildAudience();
    const { toCsv, sendCsv, dateStamp } = await import('../utils/csv');
    const csv = toCsv(entries, [
      { header: 'Email', value: (e) => e.email },
      { header: 'Sources', value: (e) => e.sources.join(' | ') },
    ]);
    sendCsv(res, `email-audience-${dateStamp()}.csv`, csv);
  } catch (err) {
    next(err);
  }
};
