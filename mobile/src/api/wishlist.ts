import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import type { Product } from '../types';

const KEY = ['wishlist'];

export const useWishlist = () => {
  const isAuth = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: KEY,
    enabled: isAuth,
    queryFn: () => api.get('/wishlist').then((r) => (r.data.data ?? []) as Product[]),
  });
};

export const useToggleWishlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      api.post(`/wishlist/${productId}/toggle`).then((r) => r.data.data as { added: boolean }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
