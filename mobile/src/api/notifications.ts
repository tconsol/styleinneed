import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';

export interface AppNotification {
  _id: string;
  title: string;
  body: string;
  type: 'order_confirmed' | 'order_cancelled' | 'order_shipped' | 'order_delivered' | 'order_status_changed' | 'general';
  orderId?: string;
  orderNumber?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsData {
  items: AppNotification[];
  unreadCount: number;
}

export const useNotifications = () => {
  const isAuth = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['notifications'],
    enabled: isAuth,
    staleTime: 30_000,
    queryFn: () =>
      api.get('/notifications').then((r) => r.data.data as NotificationsData),
  });
};

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const registerPushToken = (token: string) =>
  api.post('/notifications/push-token', { token });

export const removePushToken = () =>
  api.delete('/notifications/push-token');
