import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface CouponResult {
  code: string;
  type: string;
  discountAmount: number;
  freeShipping: boolean;
}

export const useApplyCoupon = () =>
  useMutation({
    mutationFn: (p: { code: string; cartTotal: number }) =>
      api.post('/coupons/apply', p).then((r) => r.data.data as CouponResult),
  });
