export const formatPrice = (n: number, currency: 'INR' | 'USD' = 'INR') =>
  new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
    style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(n || 0);

export const formatDate = (d: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d));

export const formatDateTime = (d: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('en-IN').format(n);

export const pctChange = (current: number, prev: number) => {
  if (!prev) return null;
  return (((current - prev) / prev) * 100).toFixed(1);
};
