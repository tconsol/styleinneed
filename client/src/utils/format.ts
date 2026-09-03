export const formatPrice = (amount: number, currency: 'INR' | 'USD' = 'INR'): string =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

export const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));

export const truncate = (text: string, length: number): string =>
  text.length > length ? text.slice(0, length) + '...' : text;

export const getDiscountBadge = (mrp: number, salePrice: number): number =>
  Math.round(((mrp - salePrice) / mrp) * 100);
