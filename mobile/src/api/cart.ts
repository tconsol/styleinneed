import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import type { Cart } from '../types';

const KEY = ['cart'];

export const useCart = () => {
  const isAuth = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: KEY,
    enabled: isAuth,
    queryFn: () => api.get('/cart').then((r) => r.data.data as Cart),
  });
};

export const useCartMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const add = useMutation({
    mutationFn: (p: { productId: string; variantSku: string; quantity?: number }) =>
      api.post('/cart/add', p),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (p: { productId: string; variantSku: string; quantity: number }) =>
      api.patch(`/cart/item/${p.productId}`, { variantSku: p.variantSku, quantity: p.quantity }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (p: { productId: string; variantSku: string }) =>
      api.delete(`/cart/item/${p.productId}`, { data: { variantSku: p.variantSku } }),
    onSuccess: invalidate,
  });
  const clear = useMutation({
    mutationFn: () => api.delete('/cart/clear'),
    onSuccess: invalidate,
  });

  return { add, update, remove, clear };
};

export const cartTotals = (cart?: Cart) => {
  const items = cart?.items ?? [];
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { count, subtotal };
};
