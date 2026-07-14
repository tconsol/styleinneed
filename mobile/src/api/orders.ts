import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import type { Order, Paginated } from '../types';

export const useMyOrders = () => {
  const isAuth = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['orders'],
    enabled: isAuth,
    queryFn: () => api.get('/orders/my', { params: { limit: 20 } }).then((r) => r.data as Paginated<Order>),
  });
};

export const useOrder = (id: string) =>
  useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data as Order),
  });

export interface CreateOrderResult {
  // COD returns orderId/orderNumber directly; online returns a sessionId + url.
  orderId?: string;
  orderNumber?: string;
  sessionId?: string;
  provider?: 'razorpay' | 'stripe';
  url?: string;
  amount?: number;
  currency?: string;
}

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { addressId: string; paymentMethod: string; couponCode?: string }) =>
      api.post('/orders', p).then((r) => r.data.data as CreateOrderResult),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const usePaymentConfig = () =>
  useQuery({
    queryKey: ['payment-config'],
    staleTime: 10 * 60_000,
    queryFn: () =>
      api.get('/orders/payment-config').then(
        (r) => r.data.data as { razorpayKeyId: string | null; stripePublishableKey: string | null; codEnabled: boolean }
      ),
  });

export interface VerifyResult { orderId: string; orderNumber: string }

/**
 * Verify a hosted payment after the user returns from the gateway browser.
 * The server creates the Order from the payment session only once paid, and
 * returns the new orderId.
 */
export const useVerifyPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { sessionId: string; provider: 'razorpay' | 'stripe' }) =>
      api
        .post(p.provider === 'stripe' ? '/orders/verify-stripe-payment' : '/orders/verify-payment', { sessionId: p.sessionId })
        .then((r) => r.data.data as VerifyResult),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; reason?: string }) =>
      api.patch(`/orders/${p.id}/cancel`, { reason: p.reason }),
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', p.id] });
    },
  });
};
