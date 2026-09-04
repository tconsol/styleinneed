import axios from 'axios';
import client from './client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
// Public, unauthenticated axios — used for storefront reads that must NEVER
// trigger the auth interceptor's refresh/logout on a 4xx (e.g. promotions).
const publicClient = axios.create({ baseURL: API_BASE });

export const reviewApi = {
  getProductReviews: (productId: string, page = 1) =>
    client.get(`/reviews/product/${productId}`, { params: { page, limit: 10 } }),

  createReview: (data: {
    productId: string;
    orderId: string;
    rating: number;
    title?: string;
    body: string;
  }) => client.post('/reviews', data),
};

export const blogApi = {
  getBlogs: (params?: { page?: number; category?: string; tag?: string }) =>
    client.get('/blogs', { params }),

  getBlogBySlug: (slug: string) => client.get(`/blogs/${slug}`),
};

export const announcementApi = {
  // Public read via the non-auth client so it can never trigger a logout for guests.
  getActive: (type?: string) =>
    publicClient.get('/announcements/active', { params: type ? { type } : {} }),

  trackClick: (id: string) => client.post(`/announcements/${id}/click`),
};

export const newsletterApi = {
  // Raw (no auth interceptor) — a guest clicking an "Unsubscribe" link in an
  // email must never trigger a refresh/logout redirect.
  subscribe: (email: string) => publicClient.post('/newsletter/subscribe', { email }),
  unsubscribe: (email: string) => publicClient.post('/newsletter/unsubscribe', { email }),
};

export const couponApi = {
  applyCoupon: (code: string, cartTotal: number) =>
    client.post('/coupons/apply', { code, cartTotal }),
};

export const cmsApi = {
  // `fresh` bypasses the browser's cached copy (CMS responses carry max-age),
  // used when a live socket event says the content just changed.
  getPage: (key: string, fresh = false) =>
    client.get(`/cms/${key}`, fresh ? { params: { _: Date.now() } } : undefined),
};

export const settingsApi = {
  get: () => client.get('/settings'),
};

export const promotionApi = {
  // Raw (no auth interceptor) — a promo fetch must never affect the user's session.
  getActive: () => publicClient.get('/promotions/active'),
};

export const shippingApi = {
  quote: (country: string, state: string, subtotal: number) =>
    client.get('/shipping-rates/quote', { params: { country, state, subtotal } }),
};

export const returnApi = {
  createReturn: (data: {
    orderId: string;
    items: { product: string; variantSku: string; quantity: number }[];
    reason: string;
    description?: string;
  }) => client.post('/returns', data),

  getMyReturns: () => client.get('/returns/my'),
};

export const supportApi = {
  createTicket: (data: { subject: string; category: string; description: string }) =>
    client.post('/support', data),

  getMyTickets: () => client.get('/support/my'),

  getTicketById: (id: string) => client.get(`/support/my/${id}`),

  addMessage: (id: string, content: string) =>
    client.post(`/support/${id}/message`, { content }),
};
