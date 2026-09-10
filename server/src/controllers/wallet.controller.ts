import { Response, NextFunction, Request } from 'express';
import crypto from 'crypto';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import GiftCard, { generateGiftCardCode, generateGiftCardPin, MAX_PIN_ATTEMPTS } from '../models/GiftCard';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { getSettings } from '../models/Settings';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { getBalance, credit, debit } from '../utils/wallet';
import { ensureReferralCode } from '../utils/referrals';
import { encryptSecret, decryptSecret } from '../utils/secretCrypto';
import { sendGiftCardEmail } from '../services/email.service';
import { getAppearance } from './settings.controller';
import { primaryClientUrl } from '../middleware/security';

/** Customer: balance + recent ledger entries. */
export const getMyWallet = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [balance, transactions, settings] = await Promise.all([
      getBalance(req.user!._id),
      WalletTransaction.find({ user: req.user!._id }).sort('-createdAt').limit(50).lean(),
      getSettings(),
    ]);

    sendSuccess(res, 'Wallet', {
      balance,
      transactions,
      maxRedeemPercent: settings.walletMaxRedeemPercent,
      earnPercent: settings.loyaltyEnabled ? settings.loyaltyEarnPercent : 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Customer: redeem a gift card into their wallet.
 *
 * Claiming is a conditional update, so two simultaneous submissions of the
 * same code can't both succeed — only the request that flips `isRedeemed`
 * false→true gets to credit the wallet.
 */
export const redeemGiftCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const pin = String(req.body.pin || '').replace(/\D/g, '');
    if (!code) { sendError(res, 'Enter a gift card code', 400); return; }

    const card = await GiftCard.findOne({ code }).select('+pin +pinAttempts');
    // Same message for "no such code" and "already used" so the endpoint can't
    // be used to enumerate which codes exist.
    const invalid = () => sendError(res, 'This gift card is not valid or has already been used', 400);
    if (!card || !card.isActive || card.isRedeemed) { invalid(); return; }
    if (card.expiresAt && card.expiresAt < new Date()) { sendError(res, 'This gift card has expired', 400); return; }

    // Cards issued before PINs existed have none, and still redeem on the code
    // alone — adding the field must not strand money already in circulation.
    const expectedPin = decryptSecret(card.pin);
    if (expectedPin) {
      if (!pin) { sendError(res, 'Enter the PIN printed on your gift card', 400); return; }

      const a = Buffer.from(pin);
      const b = Buffer.from(expectedPin);
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!ok) {
        // Count the miss atomically and lock the card once the budget is gone,
        // so a valid code can't be paired with a brute-forced PIN.
        const after = await GiftCard.findOneAndUpdate(
          { _id: card._id },
          { $inc: { pinAttempts: 1 } },
          { new: true, projection: { pinAttempts: 1 } }
        );
        const used = after?.pinAttempts ?? MAX_PIN_ATTEMPTS;
        if (used >= MAX_PIN_ATTEMPTS) {
          await GiftCard.updateOne({ _id: card._id }, { isActive: false });
          sendError(res, 'Too many incorrect PINs — this card is now locked. Contact support.', 400);
          return;
        }
        sendError(res, `Incorrect PIN. ${MAX_PIN_ATTEMPTS - used} attempt(s) left.`, 400);
        return;
      }
    }

    const claimed = await GiftCard.findOneAndUpdate(
      { _id: card._id, isRedeemed: false, isActive: true },
      { isRedeemed: true, redeemedBy: req.user!._id, redeemedAt: new Date(), pinAttempts: 0 },
      { new: true }
    );
    if (!claimed) { invalid(); return; }

    const { balance } = await credit(
      req.user!._id, claimed.amount, 'gift_card',
      `Gift card ${claimed.code.slice(-4).padStart(8, '•')} redeemed`,
      { giftCard: claimed._id }
    );

    sendSuccess(res, `₹${claimed.amount} added to your wallet`, { amount: claimed.amount, balance });
  } catch (err) {
    next(err);
  }
};

/** Customer: their referral code + how the programme pays out. */
export const getMyReferral = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await getSettings();
    if (!settings.referralEnabled) { sendSuccess(res, 'Referrals', { enabled: false }); return; }

    const code = await ensureReferralCode(req.user!._id);
    const [invited, rewarded] = await Promise.all([
      User.countDocuments({ referredBy: req.user!._id }),
      User.countDocuments({ referredBy: req.user!._id, referralRewarded: true }),
    ]);

    sendSuccess(res, 'Referrals', {
      enabled: true,
      code,
      invited,
      rewarded,
      referrerReward: settings.referrerReward,
      refereeReward: settings.refereeReward,
    });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────── Admin ───────────────────────── */

export const listGiftCards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, status } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (status === 'redeemed') filter.isRedeemed = true;
    else if (status === 'available') { filter.isRedeemed = false; filter.isActive = true; }

    const [cards, total] = await Promise.all([
      GiftCard.find(filter).populate('redeemedBy', 'name email').sort('-createdAt').skip(skip).limit(l).lean(),
      GiftCard.countDocuments(filter),
    ]);

    sendSuccess(res, 'Gift cards', cards, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    next(err);
  }
};

/**
 * Registered customers, for the gift-card recipient picker.
 *
 * Deliberately gated on `gift-cards` rather than `customers`, and returns only
 * the three fields the picker renders — issuing a card shouldn't require (or
 * leak) the full customer record.
 */
export const listGiftCardRecipients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, limit } = req.query as Record<string, string>;
    const l = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const filter: Record<string, unknown> = { role: 'customer' };
    if (search) {
      // Escaped: a stray "(" or "*" typed in the search box would otherwise
      // throw an invalid-regex error instead of just matching nothing.
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('name email').sort('name').limit(l).lean(),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, 'Recipients', users, 200, { page: 1, limit: l, total, pages: 1 });
  } catch (err) {
    next(err);
  }
};

export const createGiftCards = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const amount = Number(req.body.amount);
    const quantity = Math.min(Math.max(Number(req.body.quantity) || 1, 1), 100);
    const { issuedTo, note, expiresAt } = req.body as { issuedTo?: string; note?: string; expiresAt?: string };

    if (!amount || amount < 1) { sendError(res, 'Enter a gift card amount', 400); return; }

    // Picking recipients issues one card each, so every code is tied to a
    // named person. Without them it falls back to `quantity` blank cards.
    const rawRecipients: unknown[] = Array.isArray(req.body.recipients) ? req.body.recipients : [];
    const recipients: string[] = [...new Set(
      rawRecipients.map((r) => String(r || '').trim().toLowerCase()).filter(Boolean)
    )].slice(0, 100);

    const expiry = expiresAt ? new Date(`${expiresAt}T23:59:59`) : undefined;
    // The plain PIN exists only here and in the email — storage is encrypted.
    const build = (to?: string) => {
      const plainPin = generateGiftCardPin();
      return {
        plainPin,
        doc: {
          code: generateGiftCardCode(),
          pin: encryptSecret(plainPin),
          amount,
          issuedTo: to,
          note,
          expiresAt: expiry,
          createdBy: req.user!._id,
        },
      };
    };

    const built = recipients.length
      ? recipients.map((to) => build(to))
      : Array.from({ length: quantity }, () => build(issuedTo));

    const created = await GiftCard.insertMany(built.map((b) => b.doc));
    const count = created.length;

    await AuditLog.create({
      user: req.user!._id,
      action: 'CREATE_GIFT_CARDS',
      resource: 'giftcard',
      changes: { quantity: count, amount, total: count * amount, recipients: recipients.length || undefined },
    });

    // Deliver to real addresses. Only the rows that actually reached someone
    // get `emailSentAt`, so the admin can see who still needs their code.
    let emailed = 0;
    if (req.body.sendEmail !== false && recipients.length) {
      const appearance = await getAppearance();
      const base = primaryClientUrl();
      const named = await User.find({ email: { $in: recipients } }).select('name email').lean();
      const nameByEmail = new Map(named.map((u) => [u.email, u.name]));

      const results = await Promise.allSettled(
        created.map((card, i) => sendGiftCardEmail(card.issuedTo!, {
          code: card.code,
          pin: built[i].plainPin,
          amount: card.amount,
          recipientName: nameByEmail.get(card.issuedTo!),
          note,
          expiresAt: card.expiresAt,
          ctaUrl: `${base}/wallet`,
          theme: {
            primary: appearance.primary, primaryDark: appearance.primaryDark,
            bg: appearance.bg, surface: appearance.surface,
            text: appearance.text, muted: appearance.muted, border: appearance.border,
          },
        }))
      );

      const deliveredIds = created.filter((_, i) => results[i].status === 'fulfilled').map((c) => c._id);
      emailed = deliveredIds.length;
      if (emailed) await GiftCard.updateMany({ _id: { $in: deliveredIds } }, { emailSentAt: new Date() });
    }

    const msg = emailed
      ? `${count} gift card(s) created — ${emailed} emailed`
      : `${count} gift card(s) created`;

    // `insertMany` hands back the documents as constructed, so `select: false`
    // does not apply — strip the secrets explicitly before they leave.
    const safe = created.map((c) => {
      const { pin: _pin, pinAttempts: _pinAttempts, ...rest } = c.toObject();
      return rest;
    });
    sendSuccess(res, msg, safe, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Re-send a card to its recipient — for "I lost the email". Works because the
 * PIN is encrypted rather than hashed; a redeemed card is not re-sent, since
 * its value is already spent.
 */
export const resendGiftCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const to = String(req.body.email || '').trim().toLowerCase();
    const card = await GiftCard.findById(req.params.id).select('+pin');
    if (!card) { sendError(res, 'Gift card not found', 404); return; }
    if (card.isRedeemed) { sendError(res, 'This card has already been redeemed', 400); return; }
    if (!card.isActive) { sendError(res, 'This card is not active', 400); return; }

    const target = to || (card.issuedTo || '').trim().toLowerCase();
    if (!target.includes('@')) {
      sendError(res, 'This card has no email address on it — enter one to send it to', 400);
      return;
    }

    const appearance = await getAppearance();
    const recipient = await User.findOne({ email: target }).select('name').lean();

    await sendGiftCardEmail(target, {
      code: card.code,
      pin: decryptSecret(card.pin) || undefined,
      amount: card.amount,
      recipientName: recipient?.name,
      note: card.note,
      expiresAt: card.expiresAt,
      ctaUrl: `${primaryClientUrl()}/wallet`,
      theme: {
        primary: appearance.primary, primaryDark: appearance.primaryDark,
        bg: appearance.bg, surface: appearance.surface,
        text: appearance.text, muted: appearance.muted, border: appearance.border,
      },
    });

    card.issuedTo = target;
    card.emailSentAt = new Date();
    await card.save();

    sendSuccess(res, `Gift card sent to ${target}`, { emailSentAt: card.emailSentAt });
  } catch (err) {
    next(err);
  }
};

/** Deactivate an unredeemed card (a redeemed one has already moved money). */
export const deactivateGiftCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const card = await GiftCard.findById(req.params.id);
    if (!card) { sendError(res, 'Gift card not found', 404); return; }
    if (card.isRedeemed) { sendError(res, 'This card has already been redeemed', 400); return; }
    card.isActive = false;
    await card.save();
    sendSuccess(res, 'Gift card deactivated', card);
  } catch (err) {
    next(err);
  }
};

/** Admin: manually credit or debit a customer's wallet. */
export const adjustWallet = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, amount, reason } = req.body as { userId?: string; amount?: number; reason?: string };
    const value = Number(amount);
    if (!userId || !value) { sendError(res, 'A customer and a non-zero amount are required', 400); return; }
    if (!reason?.trim()) { sendError(res, 'A reason is required for manual adjustments', 400); return; }

    const target = await User.findById(userId).select('name email').lean();
    if (!target) { sendError(res, 'Customer not found', 404); return; }

    let result;
    if (value > 0) {
      result = await credit(userId, value, 'adjustment', reason.trim(), { actor: req.user!._id });
    } else {
      result = await debit(userId, Math.abs(value), 'adjustment', reason.trim(), { actor: req.user!._id });
      if (!result.ok) { sendError(res, 'Customer does not have enough credit for this deduction', 400); return; }
    }

    await AuditLog.create({
      user: req.user!._id,
      action: 'ADJUST_WALLET',
      resource: 'wallet',
      resourceId: userId,
      changes: { amount: value, reason: reason.trim(), balanceAfter: result.balance },
    });

    sendSuccess(res, 'Wallet adjusted', { balance: result.balance });
  } catch (err) {
    next(err);
  }
};

/** Admin: one customer's balance + full ledger. */
export const getUserWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [wallet, transactions] = await Promise.all([
      Wallet.findOne({ user: req.params.id }).lean(),
      WalletTransaction.find({ user: req.params.id }).sort('-createdAt').limit(100).lean(),
    ]);
    sendSuccess(res, 'Wallet', { balance: wallet?.balance ?? 0, transactions });
  } catch (err) {
    next(err);
  }
};
