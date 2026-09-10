import { Request, Response, NextFunction } from 'express';
import Product from '../models/Product';
import AuditLog from '../models/AuditLog';
import { getSettings } from '../models/Settings';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { invalidateCache } from '../middleware/cache';

interface StockRow {
  productId: string;
  productName: string;
  slug: string;
  image?: string;
  categoryName?: string;
  sku: string;
  stock: number;
  attributes: Record<string, string>;
  isActive: boolean;
}

/**
 * One row per VARIANT, not per product — restocking is a per-SKU job, and a
 * product-level list would hide which size or colour actually ran out.
 */
export const getInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search, status, productType } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);
    const settings = await getSettings();
    const threshold = settings.lowStockThreshold ?? 5;

    const filter: Record<string, unknown> = {};
    if (productType) filter.productType = productType;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await Product.find(filter)
      .select('name slug images variants isActive category productType')
      .populate('category', 'name')
      .sort('name')
      .lean();

    const rows: StockRow[] = [];
    for (const prod of products) {
      for (const v of prod.variants || []) {
        rows.push({
          productId: String(prod._id),
          productName: prod.name,
          slug: prod.slug,
          image: prod.images?.[0],
          categoryName: (prod.category as unknown as { name?: string } | null)?.name,
          sku: v.sku,
          stock: v.stock,
          attributes: (v.attributes as unknown as Record<string, string>) || {},
          isActive: prod.isActive,
        });
      }
    }

    const filtered = rows.filter((r) => {
      if (status === 'out') return r.stock <= 0;
      if (status === 'low') return r.stock > 0 && r.stock <= threshold;
      if (status === 'healthy') return r.stock > threshold;
      return true;
    });

    // Most urgent first, so the worklist opens on what needs attention.
    filtered.sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName));

    sendSuccess(res, 'Inventory', filtered.slice(skip, skip + l), 200, {
      page: p, limit: l, total: filtered.length, pages: Math.ceil(filtered.length / l),
    });
  } catch (err) {
    next(err);
  }
};

/** Headline counts for the worklist tabs. */
export const getInventorySummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await getSettings();
    const threshold = settings.lowStockThreshold ?? 5;

    const products = await Product.find().select('variants').lean();
    let out = 0, low = 0, healthy = 0, units = 0;
    for (const prod of products) {
      for (const v of prod.variants || []) {
        units += v.stock;
        if (v.stock <= 0) out += 1;
        else if (v.stock <= threshold) low += 1;
        else healthy += 1;
      }
    }

    sendSuccess(res, 'Inventory summary', {
      threshold, out, low, healthy, variants: out + low + healthy, units,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Apply stock changes to many SKUs at once.
 *
 * `mode` is 'set' (absolute) or 'add' (a delta, for receiving a shipment).
 * Each write is conditional on the SKU still existing, and 'add' uses $inc so a
 * concurrent sale isn't silently overwritten by a stale value read in the UI.
 */
export const bulkAdjustStock = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { mode, updates } = req.body as {
      mode?: 'set' | 'add';
      updates?: { productId: string; sku: string; value: number }[];
    };

    if (mode !== 'set' && mode !== 'add') { sendError(res, "mode must be 'set' or 'add'", 400); return; }
    if (!updates?.length) { sendError(res, 'No stock changes supplied', 400); return; }
    if (updates.length > 200) { sendError(res, 'Adjust at most 200 SKUs at a time', 400); return; }

    let applied = 0;
    const failed: { sku: string; reason: string }[] = [];

    for (const u of updates) {
      const value = Number(u.value);
      if (!Number.isFinite(value)) { failed.push({ sku: u.sku, reason: 'Not a number' }); continue; }
      if (mode === 'set' && value < 0) { failed.push({ sku: u.sku, reason: 'Stock cannot be negative' }); continue; }

      const res$ = await Product.updateOne(
        // For a decrement, require enough on hand so stock can't go negative.
        mode === 'add' && value < 0
          ? { _id: u.productId, variants: { $elemMatch: { sku: u.sku, stock: { $gte: Math.abs(value) } } } }
          : { _id: u.productId, 'variants.sku': u.sku },
        mode === 'set'
          ? { $set: { 'variants.$.stock': value } }
          : { $inc: { 'variants.$.stock': value } }
      );

      if (res$.matchedCount === 0) {
        failed.push({ sku: u.sku, reason: mode === 'add' && value < 0 ? 'Not enough stock' : 'SKU not found' });
        continue;
      }
      applied += 1;
      emitEvent(SOCKET_EVENTS.stockUpdated, { productId: u.productId, sku: u.sku });
    }

    if (applied > 0) void invalidateCache('/api/v1/products');

    await AuditLog.create({
      user: req.user!._id,
      action: 'ADJUST_STOCK',
      resource: 'product',
      changes: { mode, requested: updates.length, applied, failed: failed.length },
    });

    sendSuccess(res, `${applied} SKU(s) updated${failed.length ? `, ${failed.length} skipped` : ''}`, {
      applied, failed,
    });
  } catch (err) {
    next(err);
  }
};
