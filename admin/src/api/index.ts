import client from './client';

export const authApi = {
  login: (email: string, password: string) => client.post('/auth/login', { email, password }),
  logout: (refreshToken: string) => client.post('/auth/logout', { refreshToken }),
  getMe: () => client.get('/auth/me'),
};

export const dashboardApi = {
  getStats: () => client.get('/admin/dashboard'),
  getRevenue: (period?: string) => client.get('/admin/analytics/revenue', { params: { period } }),
  getTopProducts: () => client.get('/admin/analytics/top-products'),
};

export const productApi = {
  getAll: (params?: object) => client.get('/admin/products', { params }),
  getById: (id: string) => client.get(`/admin/products/${id}`),
  create: (data: object) => client.post('/products', data),
  update: (id: string, data: object) => client.patch(`/products/${id}`, data),
  delete: (id: string) => client.delete(`/products/${id}`),
  uploadImages: (files: FormData) => client.post('/products/upload/images', files, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteImage: (url: string) => client.delete('/products/upload/image', { data: { url } }),
};

export const categoryApi = {
  getAll: () => client.get('/catalog/categories', { params: { includeInactive: true } }),
  create: (data: object) => client.post('/catalog/categories', data),
  update: (id: string, data: object) => client.patch(`/catalog/categories/${id}`, data),
  delete: (id: string) => client.delete(`/catalog/categories/${id}`),
};

export const collectionApi = {
  getAll: () => client.get('/catalog/collections', { params: { includeInactive: true } }),
  create: (data: object) => client.post('/catalog/collections', data),
  update: (id: string, data: object) => client.patch(`/catalog/collections/${id}`, data),
  delete: (id: string) => client.delete(`/catalog/collections/${id}`),
};

export const productTypeApi = {
  getAll: () => client.get('/catalog/product-types', { params: { includeInactive: true } }),
  create: (data: object) => client.post('/catalog/product-types', data),
  update: (id: string, data: object) => client.patch(`/catalog/product-types/${id}`, data),
  delete: (id: string) => client.delete(`/catalog/product-types/${id}`),
};

export const attributeApi = {
  getAll: () => client.get('/catalog/attributes', { params: { includeInactive: true } }),
  create: (data: object) => client.post('/catalog/attributes', data),
  update: (id: string, data: object) => client.patch(`/catalog/attributes/${id}`, data),
  delete: (id: string) => client.delete(`/catalog/attributes/${id}`),
};

export const orderApi = {
  getAll: (params?: object) => client.get('/admin/orders', { params }),
  getById: (id: string) => client.get(`/admin/orders/${id}`),
  updateStatus: (id: string, data: object) => client.patch(`/admin/orders/${id}/status`, data),
};

export const customerApi = {
  getAll: (params?: object) => client.get('/admin/users', { params }),
  updateRole: (id: string, data: object) => client.patch(`/admin/users/${id}`, data),
};

export const couponApi = {
  getAll: (params?: object) => client.get('/coupons', { params }),
  create: (data: object) => client.post('/coupons', data),
  update: (id: string, data: object) => client.patch(`/coupons/${id}`, data),
  delete: (id: string) => client.delete(`/coupons/${id}`),
};

export const announcementApi = {
  getAll: (params?: object) => client.get('/announcements', { params }),
  create: (data: object) => client.post('/announcements', data),
  update: (id: string, data: object) => client.patch(`/announcements/${id}`, data),
  delete: (id: string) => client.delete(`/announcements/${id}`),
};

export const promotionApi = {
  getAll: (params?: object) => client.get('/promotions', { params }),
  create: (data: object) => client.post('/promotions', data),
  update: (id: string, data: object) => client.patch(`/promotions/${id}`, data),
  delete: (id: string) => client.delete(`/promotions/${id}`),
};

export const blogApi = {
  getAll: (params?: object) => client.get('/blogs', { params }),
  getBySlug: (slug: string) => client.get(`/blogs/${slug}`),
  create: (data: FormData) => client.post('/blogs', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: object) => client.patch(`/blogs/${id}`, data),
  delete: (id: string) => client.delete(`/blogs/${id}`),
};

// Fixed: use /reviews/admin/all endpoint
export const reviewApi = {
  getAll: (params?: object) => client.get('/reviews/admin/all', { params }),
  getPending: () => client.get('/reviews/admin/all', { params: { isApproved: false } }),
  approve: (id: string) => client.patch(`/reviews/${id}/approve`),
  delete: (id: string) => client.delete(`/reviews/${id}`),
};

export const newsletterApi = {
  getSubscribers: (params?: object) => client.get('/newsletter/subscribers', { params }),
};

export const supportApi = {
  getAll: (params?: object) => client.get('/support', { params }),
  getById: (id: string) => client.get(`/support/${id}`),
  update: (id: string, data: object) => client.patch(`/support/${id}`, data),
  addMessage: (id: string, content: string, isInternal = false) => client.post(`/support/${id}/message`, { content, isInternal }),
};

export const returnApi = {
  getAll: (params?: object) => client.get('/returns', { params }),
  updateStatus: (id: string, data: object) => client.patch(`/returns/${id}/status`, data),
};

export const cmsApi = {
  list: () => client.get('/cms'),
  get: (key: string) => client.get(`/cms/${key}`),
  upsert: (key: string, data: object) => client.put(`/cms/${key}`, data),
};

export const auditApi = {
  getLogs: (params?: object) => client.get('/admin/audit-logs', { params }),
};

export const providerApi = {
  getAll: (params?: object) => client.get('/providers', { params }),
  getAllSimple: () => client.get('/providers/all'),
  getById: (id: string) => client.get(`/providers/${id}`),
  create: (data: object) => client.post('/providers', data),
  update: (id: string, data: object) => client.patch(`/providers/${id}`, data),
  delete: (id: string) => client.delete(`/providers/${id}`),
};

export const notificationApi = {
  broadcast: (data: { title: string; body: string; type: string; deepLink?: string }) =>
    client.post('/notifications/broadcast', data),
  getStats: () => client.get('/notifications/broadcast/stats'),
};

export const sizeChartApi = {
  getAll: (params?: object) => client.get('/size-charts', { params }),
  getById: (id: string) => client.get(`/size-charts/${id}`),
  create: (data: object) => client.post('/size-charts', data),
  update: (id: string, data: object) => client.patch(`/size-charts/${id}`, data),
  delete: (id: string) => client.delete(`/size-charts/${id}`),
};
