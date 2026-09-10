import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '../types';
import { authApi } from '../api';
import toast from 'react-hot-toast';

/**
 * `twoFactorRequired` means the password was right but a second factor is
 * still owed — the sign-in form swaps to the code step rather than showing
 * "invalid credentials".
 */
export interface LoginResult {
  ok: boolean;
  twoFactorRequired?: boolean;
  message?: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totp?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<boolean>;
}

// Providers are staff too — they get in but are restricted to the Products area.
const STAFF_ROLES = ['admin', 'super_admin', 'manager', 'provider'];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, totp) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(email, password, totp);
          const { accessToken, refreshToken, user } = data.data;

          if (!STAFF_ROLES.includes(user.role)) {
            toast.error('Access denied. Staff account required.');
            set({ isLoading: false });
            return { ok: false, message: 'Access denied. Staff account required.' };
          }

          localStorage.setItem('adminAccessToken', accessToken);
          localStorage.setItem('adminRefreshToken', refreshToken);
          set({ user, isAuthenticated: true, isLoading: false });
          toast.success(`Welcome, ${user.name}`);
          return { ok: true };
        } catch (err) {
          set({ isLoading: false });
          const body = (err as { response?: { data?: { message?: string; errors?: { twoFactorRequired?: boolean } } } })
            .response?.data;
          return {
            ok: false,
            twoFactorRequired: !!body?.errors?.twoFactorRequired,
            message: body?.message,
          };
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

      updateProfile: async (payload) => {
        try {
          const { data } = await authApi.updateProfile(payload);
          set({ user: data.data });
          toast.success('Profile updated');
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'styleinneed-admin-auth',
      partialize: (s) => ({ isAuthenticated: s.isAuthenticated }),
    }
  )
);
