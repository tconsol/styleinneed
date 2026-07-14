export const formatPrice = (n: number, currency: 'INR' | 'USD' = 'INR'): string =>
  currency === 'USD'
    ? `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const formatDate = (date: string | number | Date): string => {
  const d = new Date(date);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
