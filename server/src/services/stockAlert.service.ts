import Product from '../models/Product';
import User from '../models/User';
import { getSettings } from '../models/Settings';
import { sendLowStockEmail } from './email.service';
import { sendPushToUser } from './push.service';
import logger from '../utils/logger';

/**
 * Warn the admins when a variant drops to/below the low-stock threshold.
 *
 * Only fires on the *crossing* (previous stock was above the line, or the
 * variant just hit zero) so restocking and further sales don't re-spam the
 * same alert. Entirely best-effort: never throws into the order flow.
 */
export const checkLowStock = async (
  productId: string,
  sku: string,
  soldQty: number
): Promise<void> => {
  try {
    const settings = await getSettings();
    if (!settings.lowStockAlerts) return;
    const threshold = settings.lowStockThreshold ?? 5;

    const product = await Product.findById(productId).select('name slug variants').lean();
    if (!product) return;

    const variant = product.variants?.find((v) => v.sku === sku);
    if (!variant) return;

    const now = variant.stock;
    const before = now + soldQty;

    // Crossed the threshold on this sale, or just went out of stock.
    const crossedThreshold = now <= threshold && before > threshold;
    const justEmptied = now === 0 && before > 0;
    if (!crossedThreshold && !justEmptied) return;

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id email name').lean();
    if (admins.length === 0) return;

    const label = now === 0 ? 'OUT OF STOCK' : `LOW STOCK (${now} left)`;
    const title = `${label}: ${product.name}`;
    const body = `Variant ${sku} is down to ${now} unit(s).`;

    await Promise.allSettled([
      ...admins.map((a) =>
        sendPushToUser({ userId: a._id, title, body, type: 'general' })
      ),
      sendLowStockEmail(
        admins.map((a) => a.email),
        { productName: product.name, slug: product.slug, sku, stock: now, threshold }
      ),
    ]);
  } catch (err) {
    logger.warn('Low-stock alert failed:', err);
  }
};
