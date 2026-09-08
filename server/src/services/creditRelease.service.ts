import PaymentSession from '../models/PaymentSession';
import { getSettings } from '../models/Settings';
import { refundToWallet } from '../utils/wallet';
import logger from '../utils/logger';

const SWEEP_INTERVAL = 10 * 60 * 1000; // 10 min

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Return store credit that was reserved for a checkout the customer never paid.
 *
 * Credit is debited when the payment session is created so it can't be spent
 * twice while the shopper is at the gateway. If they abandon it, this hands the
 * credit back. `creditReleased` is flipped with a conditional update so a
 * session is only ever released once, and sessions live a few hours past their
 * payment window so this always runs before the row is purged.
 */
export const releaseAbandonedCredit = async (): Promise<{ released: number }> => {
  const now = new Date();
  const sessions = await PaymentSession.find({
    status: 'pending',
    creditReleased: false,
    walletCreditUsed: { $gt: 0 },
    expiresAt: { $lt: now },
  }).limit(100);

  let released = 0;
  for (const session of sessions) {
    try {
      const claimed = await PaymentSession.findOneAndUpdate(
        { _id: session._id, creditReleased: false, status: 'pending' },
        { creditReleased: true },
        { new: true }
      );
      if (!claimed) continue;

      const settings = await getSettings();
      const inr = session.currency === 'USD'
        ? session.walletCreditUsed * (settings.usdExchangeRate || 83)
        : session.walletCreditUsed;

      await refundToWallet(session.user, inr, 'Store credit returned — checkout not completed');
      released += 1;
    } catch (err) {
      logger.warn(`Credit release failed for session ${session._id}:`, err);
    }
  }

  if (released > 0) logger.info(`Released store credit for ${released} abandoned checkout(s)`);
  return { released };
};

export const startCreditReleaseSweep = (): void => {
  timer = setInterval(() => void releaseAbandonedCredit(), SWEEP_INTERVAL);
  if (typeof timer.unref === 'function') timer.unref();
};

export const stopCreditReleaseSweep = (): void => {
  if (timer) clearInterval(timer);
  timer = null;
};
