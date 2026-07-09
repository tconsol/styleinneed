import client from './client';

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
  getActive: (type?: string) =>
    client.get('/announcements/active', { params: type ? { type } : {} }),

  trackClick: (id: string) => client.post(`/announcements/${id}/click`),
};

export const newsletterApi = {
  subscribe: (email: string) => client.post('/newsletter/subscribe', { email }),
  unsubscribe: (email: string) => client.post('/newsletter/unsubscribe', { email }),
};

export const couponApi = {
  applyCoupon: (code: string, cartTotal: number) =>
    client.post('/coupons/apply', { code, cartTotal }),
};

export const cmsApi = {
  getPage: (key: string) => client.get(`/cms/${key}`),
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
