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

// Single-flight refresh: concurrent 401s share ONE refresh call, so the refresh
// token is only rotated once. Without this, a second in-flight request refreshes
// with the just-rotated (now invalid) token and gets logged out mid-checkout.
let refreshPromise: Promise<string> | null = null;

const runRefresh = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${API_BASE}/auth/refresh-token`, { refreshToken });
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  return data.data.accessToken as string;
};

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        // Reuse an in-progress refresh if one is already running.
        refreshPromise = refreshPromise ?? runRefresh().finally(() => { refreshPromise = null; });
        const newToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original); // retry the original request with the fresh token
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Persisted zustand auth is stale now too — drop it so guards re-evaluate.
        try { localStorage.removeItem('styleinneed-auth'); } catch { /* ignore */ }
        if (!window.location.pathname.startsWith('/auth/')) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(err);
      }
    }

    const message = err.response?.data?.message || 'Something went wrong';
    if (err.response?.status !== 401) toast.error(message);

    return Promise.reject(err);
  }
);

export default client;
