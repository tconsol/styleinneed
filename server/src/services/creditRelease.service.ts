import PaymentSession from '../models/PaymentSession';
import { getSettings } from '../models/Settings';
import { refundToWallet } from '../utils/wallet';
import { releaseStock } from '../utils/stock';
import logger from '../utils/logger';

const SWEEP_INTERVAL = 10 * 60 * 1000; // 10 min

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Undo the holds an abandoned checkout left behind: the stock reserved for it
 * and any store credit that was debited up front.
 *
 * Both are taken when the payment session is created so they can't be
 * double-spent while the shopper is at the gateway; if they never pay, this
 * hands them back. `creditReleased` is flipped with a conditional update so a
 * session is only ever released once, and sessions live a few hours past their
 * payment window so this always runs before the row is purged.
 */
export const releaseAbandonedCredit = async (): Promise<{ released: number }> => {
  const now = new Date();
  const sessions = await PaymentSession.find({
    status: 'pending',
    creditReleased: false,
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

      // Put the held stock back on sale.
      await releaseStock(
        session.items.map((i) => ({
          product: String(i.product), variantSku: i.variant.sku, quantity: i.quantity,
        }))
      );

      if (session.walletCreditUsed > 0) {
        const settings = await getSettings();
        const inr = session.currency === 'USD'
          ? session.walletCreditUsed * (settings.usdExchangeRate || 83)
          : session.walletCreditUsed;
        await refundToWallet(session.user, inr, 'Store credit returned — checkout not completed');
      }
      released += 1;
    } catch (err) {
      logger.warn(`Credit release failed for session ${session._id}:`, err);
    }
  }

  if (released > 0) logger.info(`Released stock/credit for ${released} abandoned checkout(s)`);
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
