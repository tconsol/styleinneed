import { Response, NextFunction, Request } from 'express';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import GiftCard, { generateGiftCardCode } from '../models/GiftCard';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { getSettings } from '../models/Settings';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { getBalance, credit, debit } from '../utils/wallet';
import { ensureReferralCode } from '../utils/referrals';

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
    if (!code) { sendError(res, 'Enter a gift card code', 400); return; }

    const card = await GiftCard.findOne({ code });
    // Same message for "no such code" and "already used" so the endpoint can't
    // be used to enumerate which codes exist.
    const invalid = () => sendError(res, 'This gift card is not valid or has already been used', 400);
    if (!card || !card.isActive || card.isRedeemed) { invalid(); return; }
    if (card.expiresAt && card.expiresAt < new Date()) { sendError(res, 'This gift card has expired', 400); return; }

    const claimed = await GiftCard.findOneAndUpdate(
      { _id: card._id, isRedeemed: false, isActive: true },
      { isRedeemed: true, redeemedBy: req.user!._id, redeemedAt: new Date() },
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

export const createGiftCards = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const amount = Number(req.body.amount);
    const quantity = Math.min(Math.max(Number(req.body.quantity) || 1, 1), 100);
    const { issuedTo, note, expiresAt } = req.body as { issuedTo?: string; note?: string; expiresAt?: string };

    if (!amount || amount < 1) { sendError(res, 'Enter a gift card amount', 400); return; }

    const docs = Array.from({ length: quantity }, () => ({
      code: generateGiftCardCode(),
      amount,
      issuedTo,
      note,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : undefined,
      createdBy: req.user!._id,
    }));
    const created = await GiftCard.insertMany(docs);

    await AuditLog.create({
      user: req.user!._id,
      action: 'CREATE_GIFT_CARDS',
      resource: 'giftcard',
      changes: { quantity, amount, total: quantity * amount },
    });

    sendSuccess(res, `${quantity} gift card(s) created`, created, 201);
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
