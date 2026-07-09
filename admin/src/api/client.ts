import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Clear all auth state and send the user to the sign-in page.
const forceLogout = () => {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('styleinneed-admin-auth'); // zustand persisted auth
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAccessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh mutex: prevents multiple simultaneous refresh attempts.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string | null) => {
  refreshQueue.forEach((resolve) => { if (token) resolve(token); });
  refreshQueue = [];
};

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('adminRefreshToken');

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(client(original));
          });
        });
      }

      if (refreshToken) {
        isRefreshing = true;
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh-token`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = data.data;
          localStorage.setItem('adminAccessToken', accessToken);
          localStorage.setItem('adminRefreshToken', newRefresh);
          original.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(accessToken);
          return client(original);
        } catch {
          processQueue(null);
          forceLogout();
        } finally {
          isRefreshing = false;
        }
      } else {
        forceLogout();
      }
    }
    const message = err.response?.data?.message || 'Something went wrong';
    if (err.response?.status !== 401) toast.error(message);
    return Promise.reject(err);
  }
);

export default client;
