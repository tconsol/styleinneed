import crypto from 'crypto';
import User from '../models/User';
import { getSettings } from '../models/Settings';
import { credit } from './wallet';
import logger from './logger';
import { Types } from 'mongoose';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomCode = (len = 8): string => {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
};

/**
 * Return the user's referral code, minting one on first use.
 *
 * The unique index on `referralCode` is the real guard against collisions —
 * on the (vanishingly rare) duplicate we simply try again.
 */
export const ensureReferralCode = async (userId: Types.ObjectId | string): Promise<string> => {
  const user = await User.findById(userId).select('referralCode');
  if (!user) throw new Error('User not found');
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      user.referralCode = code;
      await user.save();
      return code;
    } catch {
      /* duplicate key — try another */
    }
  }
  throw new Error('Could not allocate a referral code');
};

/** Resolve an invite code to the inviting user, or null. */
export const findReferrer = async (code?: string) => {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return null;
  return User.findOne({ referralCode: clean }).select('_id name').lean();
};

/**
 * Pay out a referral once the invited customer's first order is settled.
 *
 * The `referralRewarded` flag is flipped with a conditional update, so a
 * customer placing two orders at once can't trigger the payout twice. Runs
 * best-effort: a failure here must never fail the order.
 */
export const rewardReferralOnFirstOrder = async (userId: Types.ObjectId | string): Promise<void> => {
  try {
    const settings = await getSettings();
    if (!settings.referralEnabled) return;

    const user = await User.findById(userId).select('name referredBy referralRewarded').lean();
    if (!user?.referredBy || user.referralRewarded) return;

    // Claim the payout: only the update that actually flips the flag proceeds.
    const claimed = await User.findOneAndUpdate(
      { _id: userId, referralRewarded: false, referredBy: { $ne: null } },
      { referralRewarded: true },
      { new: true }
    );
    if (!claimed) return;

    if (settings.referrerReward > 0) {
      await credit(
        user.referredBy, settings.referrerReward, 'referral',
        `Referral reward — ${user.name || 'a friend'} placed their first order`
      );
    }
    if (settings.refereeReward > 0) {
      await credit(userId, settings.refereeReward, 'referral', 'Welcome bonus for joining via a referral');
    }
  } catch (err) {
    logger.warn('Referral reward failed:', err);
  }
};
