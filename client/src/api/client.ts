import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── 401 handling with a single-flight refresh + a queue ──────────────────────
// Concurrent 401s wait on ONE refresh (so the refresh token rotates once), and
// every retried request — GET or POST — is dispatched only AFTER the new token
// is stored, with the header set explicitly so a POST retry can't send a stale
// token.
let isRefreshing = false;
let queue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = [];

const flushQueue = (error: unknown, token: string | null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token as string)));
  queue = [];
};

const forceReauth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  try { localStorage.removeItem('styleinneed-auth'); } catch { /* ignore */ }
  if (!window.location.pathname.startsWith('/auth/')) {
    window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
};

const retryWithToken = (original: import('axios').InternalAxiosRequestConfig, token: string) => {
  original.headers = original.headers || {};
  (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  return client(original);
};

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as (import('axios').InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      // A refresh is already running → queue this request until it resolves.
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => queue.push({ resolve, reject }))
          .then((token) => retryWithToken(original, token))
          .catch((e) => Promise.reject(e));
      }

      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/auth/refresh-token`, { refreshToken });
        const newToken: string | undefined = data?.data?.accessToken;
        const newRefresh: string | undefined = data?.data?.refreshToken;
        if (!newToken) throw new Error('Malformed refresh response');

        localStorage.setItem('accessToken', newToken);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        client.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        flushQueue(null, newToken);          // release any queued requests
        return retryWithToken(original, newToken); // retry this one with the fresh token
      } catch (refreshError) {
        flushQueue(refreshError, null);
        forceReauth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // A retried request that STILL 401s → the session is genuinely dead.
    if (err.response?.status === 401 && original?._retry) {
      forceReauth();
      return Promise.reject(err);
    }

    const message = err.response?.data?.message || 'Something went wrong';
    if (err.response?.status !== 401) toast.error(message);

    return Promise.reject(err);
  }
);

export default client;
