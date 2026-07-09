import { create } from 'zustand';
import { api } from '../lib/api';
import { tokenStore } from '../lib/tokenStore';
import { setupPushNotifications } from '../lib/pushNotifications';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean; // finished checking stored token on launch
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (accessToken: string) => Promise<void>;
  register: (payload: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = data.data;
    await tokenStore.set(accessToken, refreshToken);
    set({ user, isAuthenticated: true });
    void setupPushNotifications();
  },

  googleLogin: async (accessToken: string) => {
    const { data } = await api.post('/auth/google', { credential: accessToken });
    const { accessToken: at, refreshToken, user } = data.data;
    await tokenStore.set(at, refreshToken);
    set({ user, isAuthenticated: true });
    void setupPushNotifications();
  },

  register: async (payload) => {
    await api.post('/auth/register', payload);
    // Server sends OTP; verification handled on its screen. No tokens yet.
  },

  verifyEmail: async (email, otp) => {
    await api.post('/auth/verify-email', { email, otp });
  },

  resendOtp: async (email) => {
    await api.post('/auth/resend-otp', { email });
  },

  // Server always responds success (doesn't leak whether the email exists) and,
  // if the account is real, emails a web link to finish the reset there.
  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data.message as string;
  },

  logout: async () => {
    const refresh = await tokenStore.getRefresh();
    try { if (refresh) await api.post('/auth/logout', { refreshToken: refresh }); } catch { /* ignore */ }
    await tokenStore.clear();
    set({ user: null, isAuthenticated: false });
  },

  // On launch: if a token exists, fetch the current user.
  hydrate: async () => {
    const token = await tokenStore.getAccess();
    if (!token) { set({ hydrated: true }); return; }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, hydrated: true });
      // Re-register token on app restart (token may have changed)
      void setupPushNotifications();
    } catch {
      await tokenStore.clear();
      set({ user: null, isAuthenticated: false, hydrated: true });
    }
  },
}));
