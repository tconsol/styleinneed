import Product from '../models/Product';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { invalidateCache } from '../middleware/cache';
import logger from './logger';

export interface StockLine {
  product: string;
  variantSku: string;
  quantity: number;
}

/**
 * Take one variant's stock, but only if there's enough left.
 *
 * The `$elemMatch` carries the `stock >= quantity` condition into the same
 * atomic update that decrements it, so two shoppers racing for the last unit
 * can't both succeed — one of them gets modifiedCount 0.
 */
const takeOne = async (line: StockLine): Promise<boolean> => {
  const res = await Product.updateOne(
    {
      _id: line.product,
      variants: { $elemMatch: { sku: line.variantSku, stock: { $gte: line.quantity } } },
    },
    { $inc: { 'variants.$.stock': -line.quantity } }
  );
  return res.modifiedCount === 1;
};

/** Give a variant's stock back. */
const giveBackOne = async (line: StockLine): Promise<void> => {
  await Product.updateOne(
    { _id: line.product, 'variants.sku': line.variantSku },
    { $inc: { 'variants.$.stock': line.quantity } }
  );
};

/**
 * Hold stock for a checkout that hasn't been paid for yet.
 *
 * All-or-nothing: if any line can't be satisfied, everything already taken is
 * put back before returning, so a partial reservation never lingers. Returns
 * the SKU that ran out so the caller can name it in the error.
 */
export const reserveStock = async (
  lines: StockLine[]
): Promise<{ ok: true } | { ok: false; failedSku: string }> => {
  const taken: StockLine[] = [];

  for (const line of lines) {
    if (await takeOne(line)) {
      taken.push(line);
    } else {
      // Roll back whatever we already took.
      for (const done of taken) await giveBackOne(done).catch(() => {});
      return { ok: false, failedSku: line.variantSku };
    }
  }

  for (const line of taken) {
    emitEvent(SOCKET_EVENTS.stockUpdated, { productId: line.product, sku: line.variantSku });
  }
  void invalidateCache('/api/v1/products');
  return { ok: true };
};

/** Return reserved stock — used when a checkout is abandoned or fails. */
export const releaseStock = async (lines: StockLine[]): Promise<void> => {
  for (const line of lines) {
    try {
      await giveBackOne(line);
      emitEvent(SOCKET_EVENTS.stockUpdated, { productId: line.product, sku: line.variantSku });
    } catch (err) {
      logger.warn(`Could not release stock for ${line.variantSku}:`, err);
    }
  }
  void invalidateCache('/api/v1/products');
};
