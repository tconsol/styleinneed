import Promotion, { IPromotion } from '../models/Promotion';
import { IProduct } from '../types';
import { Currency, toUsd } from './pricing';

/** Currently-live promotions (active + within the date window). */
export const getActivePromotions = async (): Promise<IPromotion[]> => {
  const now = new Date();
  return Promotion.find({
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
  }).lean() as unknown as IPromotion[];
};

/** Does a promotion apply to a given product? Empty product+category lists = all. */
export const promoApplies = (product: Pick<IProduct, '_id' | 'category'>, promo: IPromotion): boolean => {
  const hasProd = promo.applicableProducts?.length;
  const hasCat = promo.applicableCategories?.length;
  if (!hasProd && !hasCat) return true;
  if (hasProd && promo.applicableProducts.some((id) => String(id) === String(product._id))) return true;
  if (hasCat && promo.applicableCategories.some((id) => String(id) === String(product.category))) return true;
  return false;
};

/** Apply one promotion's discount to a base price in the given currency. */
const applyOne = (base: number, promo: IPromotion, currency: Currency, rate: number): number => {
  if (promo.discountType === 'percentage') return base * (1 - promo.discountValue / 100);
  const amount = currency === 'USD' ? toUsd(promo.discountValue, rate) : promo.discountValue; // flat stored in INR
  return Math.max(0, base - amount);
};

/**
 * Best (lowest) effective price for a product across all applicable promotions.
 * Returns the base price + no promo when none apply.
 */
export const bestPromoPrice = (
  base: number,
  product: Pick<IProduct, '_id' | 'category'>,
  promos: IPromotion[],
  currency: Currency,
  rate: number,
): { price: number; promo?: IPromotion } => {
  let best = base;
  let winner: IPromotion | undefined;
  for (const p of promos) {
    if (!promoApplies(product, p)) continue;
    const eff = applyOne(base, p, currency, rate);
    if (eff < best) { best = eff; winner = p; }
  }
  return { price: Math.round(best * 100) / 100, promo: winner };
};
