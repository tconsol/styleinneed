import Cart from '../models/Cart';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { getSettings } from '../models/Settings';
import { sendAbandonedCartEmail } from './email.service';
import { primaryClientUrl } from '../middleware/security';
import logger from '../utils/logger';

const HOUR = 60 * 60 * 1000;
/** How often the sweep runs. The delay itself is admin-configurable. */
const SWEEP_INTERVAL = HOUR;
/** Stop chasing a cart that's been sitting for over a fortnight. */
const MAX_AGE_DAYS = 14;
/** Space repeat reminders out so a shopper never gets two in a day. */
const REMINDER_GAP = 24 * HOUR;

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Email shoppers who left items in their cart.
 *
 * Only carts that have been idle for the configured delay are chased, at most
 * `abandonedCartMaxReminders` times and never more than once a day. Carts
 * belonging to someone who has since ordered are skipped, as are guest
 * accounts that never opted in — the reminder goes to the address they gave us
 * for their own cart, and every mail carries an unsubscribe link.
 */
export const sweepAbandonedCarts = async (): Promise<{ sent: number }> => {
  const settings = await getSettings();
  if (!settings.abandonedCartEmails) return { sent: 0 };

  const delayMs = (settings.abandonedCartDelayHours || 6) * HOUR;
  const maxReminders = settings.abandonedCartMaxReminders ?? 2;
  if (maxReminders <= 0) return { sent: 0 };

  const now = Date.now();
  const idleBefore = new Date(now - delayMs);
  const tooOld = new Date(now - MAX_AGE_DAYS * 24 * HOUR);

  const carts = await Cart.find({
    updatedAt: { $lt: idleBefore, $gt: tooOld },
    reminderCount: { $lt: maxReminders },
    'items.0': { $exists: true },
  }).limit(200).lean();

  if (carts.length === 0) return { sent: 0 };

  const base = primaryClientUrl();
  let sent = 0;

  for (const cart of carts) {
    try {
      // Don't chase a cart we've already nudged today.
      if (cart.remindedAt && now - new Date(cart.remindedAt).getTime() < REMINDER_GAP) continue;

      const user = await User.findById(cart.user).select('name email isActive').lean();
      if (!user?.email || user.isActive === false) continue;

      // If they've ordered since the cart went quiet, there's nothing to recover.
      const ordered = await Order.exists({ user: cart.user, createdAt: { $gte: cart.updatedAt } });
      if (ordered) continue;

      // Resolve product names/images; drop anything no longer purchasable.
      const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) }, isActive: true })
        .select('name images').lean();
      const byId = new Map(products.map((p) => [String(p._id), p]));

      const items = cart.items
        .map((i) => {
          const p = byId.get(String(i.product));
          return p ? { name: p.name, image: p.images?.[0], quantity: i.quantity, price: i.price } : null;
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);

      if (items.length === 0) continue;

      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      await sendAbandonedCartEmail(user.email, {
        name: user.name?.split(' ')[0] || 'there',
        cartUrl: `${base}/cart`,
        unsubscribeUrl: `${base}/unsubscribe?email=${encodeURIComponent(user.email)}`,
        items,
        currencySymbol: '₹',
        total,
      });

      // Bump the counter without touching updatedAt, or the cart would look
      // freshly active and never qualify for the next reminder.
      await Cart.updateOne(
        { _id: cart._id },
        { $set: { remindedAt: new Date() }, $inc: { reminderCount: 1 } },
        { timestamps: false }
      );
      sent += 1;
    } catch (err) {
      logger.warn(`Abandoned-cart reminder failed for cart ${cart._id}:`, err);
    }
  }

  if (sent > 0) logger.info(`Abandoned-cart sweep: ${sent} reminder(s) sent`);
  return { sent };
};

export const startAbandonedCartSweep = (): void => {
  timer = setInterval(() => void sweepAbandonedCarts(), SWEEP_INTERVAL);
  if (typeof timer.unref === 'function') timer.unref();
};

export const stopAbandonedCartSweep = (): void => {
  if (timer) clearInterval(timer);
  timer = null;
};
