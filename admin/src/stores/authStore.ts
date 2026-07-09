import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '../types';
import { authApi } from '../api';
import toast from 'react-hot-toast';

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

const ADMIN_ROLES = ['admin', 'super_admin', 'manager'];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(email, password);
          const { accessToken, refreshToken, user } = data.data;

          if (!ADMIN_ROLES.includes(user.role)) {
            toast.error('Access denied. Admin account required.');
            set({ isLoading: false });
            return false;
          }

          localStorage.setItem('adminAccessToken', accessToken);
          localStorage.setItem('adminRefreshToken', refreshToken);
          set({ user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome, ${user.name}`);
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        try {
          if (refreshToken) await authApi.logout(refreshToken);
        } catch {}
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.getMe();
          set({ user: data.data, isAuthenticated: true });
        } catch {
          localStorage.removeItem('adminAccessToken');
          localStorage.removeItem('adminRefreshToken');
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'styleinneed-admin-auth',
      partialize: (s) => ({ isAuthenticated: s.isAuthenticated }),
    }
  )
);
