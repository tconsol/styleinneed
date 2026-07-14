import { useCurrencyStore } from '../stores/currencyStore';
import { formatPrice } from '../utils/format';

/**
 * Currency-aware money helper. All catalog prices are stored in INR; USA/Canada
 * shoppers see them auto-converted to USD (or a product's explicit USD override).
 *
 *   const { format } = useMoney();
 *   format(product.salePrice, product.usdSalePrice)  // "₹1,999" or "$24"
 */
export function useMoney() {
  const currency = useCurrencyStore((s) => s.currency);
  const rate = useCurrencyStore((s) => s.rate);

  const value = (inr: number, usdOverride?: number): number => {
    if (currency === 'USD') return usdOverride != null ? usdOverride : Math.round((inr / rate) * 100) / 100;
    return inr;
  };

  const format = (inr: number, usdOverride?: number): string => formatPrice(value(inr, usdOverride), currency);

  return { currency, rate, value, format, symbol: currency === 'USD' ? '$' : '₹' };
}
