import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { tokenStore } from './tokenStore';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach access token to every request.
api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Called by the auth store on unrecoverable 401 (set during app init).
let onAuthFailure: (() => void) | null = null;
export const setAuthFailureHandler = (fn: () => void) => { onAuthFailure = fn; };

// Refresh mutex: prevents multiple simultaneous refresh attempts.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string | null, error: unknown = null) => {
  refreshQueue.forEach((resolve) => {
    if (token) resolve(token);
  });
  refreshQueue = [];
  if (error) return Promise.reject(error);
};

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Queue this request until the in-flight refresh finishes.
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      const refresh = await tokenStore.getRefresh();
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken: refresh });
          const { accessToken, refreshToken: newRefresh } = data.data;
          await tokenStore.set(accessToken, newRefresh);
          original.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(accessToken);
          return api(original);
        } catch (refreshErr) {
          processQueue(null, refreshErr);
          await tokenStore.clear();
          onAuthFailure?.();
        } finally {
          isRefreshing = false;
        }
      } else {
        isRefreshing = false;
        await tokenStore.clear();
        onAuthFailure?.();
      }
    }
    return Promise.reject(err);
  }
);

export { API_URL };
