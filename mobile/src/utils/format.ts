export const formatPrice = (n: number): string =>
  `₹${Number(n || 0).toLocaleString('en-IN')}`;
