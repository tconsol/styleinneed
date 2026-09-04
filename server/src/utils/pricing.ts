import { IProduct, IAddress, IOrderItem } from '../types';
import { ICoupon } from '../models/Coupon';
import { ISettings } from '../models/Settings';
import ShippingRate from '../models/ShippingRate';
import { getActivePromotions, bestPromoPrice } from './promotions';

export type Region = 'IN' | 'US' | 'CA';
export type Currency = 'INR' | 'USD';

/** Map a free-text address country to a store region. Unknown -> India. */
export const regionOf = (country?: string): Region => {
  const c = (country || '').trim().toLowerCase();
  if (/united states|u\.s\.a|usa|^us$/.test(c)) return 'US';
  if (/canada|^ca$/.test(c)) return 'CA';
  return 'IN';
};

export const currencyOf = (region: Region): Currency => (region === 'IN' ? 'INR' : 'USD');

/** INR -> USD using the admin exchange rate (rate = INR per 1 USD). */
export const toUsd = (inr: number, rate: number): number =>
  Math.round((inr / (rate || 83)) * 100) / 100;

/** Per-unit product price in the target currency (usd* override wins, else convert). */
export const unitPrice = (product: IProduct, currency: Currency, rate: number): number => {
  if (currency === 'USD') {
    return product.usdSalePrice != null ? product.usdSalePrice : toUsd(product.salePrice, rate);
  }
  return product.salePrice;
};

export interface PricedLine { product: IProduct; variantSku: string; quantity: number }

export interface OrderPricing {
  region: Region;
  currency: Currency;
  items: IOrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
}

/**
 * Resolve the shipping charge for a checkout.
 * - India: free at/above the threshold, else the flat rate (INR). free_shipping coupon zeroes it.
 * - US/CA: the admin's per-state charge (USD). No free shipping, ever.
 */
export const resolveShipping = async (
  region: Region,
  address: IAddress,
  subtotal: number,
  settings: ISettings,
  freeShippingCoupon: boolean
): Promise<number> => {
  if (region === 'IN') {
    if (freeShippingCoupon) return 0;
    return subtotal >= settings.indiaFreeShipThreshold ? 0 : settings.indiaFlatShipping;
  }
  // US / CA: look up the state's rate (match by code or full name).
  const state = (address.state || '').trim();
  const rate = await ShippingRate.findOne({
    country: region,
    isActive: true,
    $or: [
      { stateCode: state.toUpperCase() },
      { stateName: new RegExp(`^${state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    ],
  });
  if (rate) return rate.charge;
  // Fallback when the state isn't matched: use the highest active charge for the country.
  const fallback = await ShippingRate.findOne({ country: region, isActive: true }).sort('-charge');
  return fallback?.charge ?? (region === 'US' ? 12 : 18);
};

/**
 * Compute the full, currency-correct pricing for a checkout. `coupon` must be
 * pre-validated (expiry/min-order/usage) by the caller; this only applies it.
 */
export const computeOrderPricing = async (
  lines: PricedLine[],
  address: IAddress,
  coupon: ICoupon | undefined,
  settings: ISettings
): Promise<OrderPricing> => {
  const region = regionOf(address.country);
  const currency = currencyOf(region);
  const rate = settings.usdExchangeRate;

  // Live promotions (flash/festival/etc.) discount the unit price at checkout.
  const activePromos = await getActivePromotions();

  let subtotal = 0;
  const items: IOrderItem[] = [];
  for (const { product, variantSku, quantity } of lines) {
    const variant = product.variants.find((v) => v.sku === variantSku)!;
    const base = unitPrice(product, currency, rate);
    const { price } = bestPromoPrice(base, product, activePromos, currency, rate);
    subtotal += price * quantity;
    items.push({ product: product._id, variant, quantity, price });
  }
  subtotal = Math.round(subtotal * 100) / 100;

  // Discount. Percentage-style coupons apply in any currency; flat/free_shipping
  // are INR-only concepts (coupon.value is stored in INR).
  let discount = 0;
  let freeShippingCoupon = false;
  if (coupon) {
    if (['percentage', 'festival', 'first_order'].includes(coupon.type)) {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        const cap = currency === 'USD' ? toUsd(coupon.maxDiscount, rate) : coupon.maxDiscount;
        discount = Math.min(discount, cap);
      }
    } else if (coupon.type === 'flat' && currency === 'INR') {
      discount = coupon.value;
    } else if (coupon.type === 'free_shipping' && currency === 'INR') {
      freeShippingCoupon = true;
    }
  }
  discount = Math.round(discount * 100) / 100;

  const shippingCharge = await resolveShipping(region, address, subtotal, settings, freeShippingCoupon);
  const total = Math.round((subtotal - discount + shippingCharge) * 100) / 100;

  return { region, currency, items, subtotal, shippingCharge, discount, total };
};
