import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import type { Address } from '../types';

const KEY = ['addresses'];

// Addresses live on the user document; fetched via /auth/me.
export const useAddresses = () => {
  const isAuth = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: KEY,
    enabled: isAuth,
    queryFn: () => api.get('/auth/me').then((r) => (r.data.data.addresses ?? []) as Address[]),
  });
};

export const useManageAddress = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const addAddress = useMutation({
    mutationFn: (address: Address) => api.post('/auth/addresses', { action: 'add', address }),
    onSuccess: invalidate,
  });
  const updateAddress = useMutation({
    mutationFn: (p: { addressId: string; address: Address }) =>
      api.post('/auth/addresses', { action: 'update', addressId: p.addressId, address: p.address }),
    onSuccess: invalidate,
  });
  const deleteAddress = useMutation({
    mutationFn: (addressId: string) => api.post('/auth/addresses', { action: 'delete', addressId }),
    onSuccess: invalidate,
  });

  return { addAddress, updateAddress, deleteAddress };
};
