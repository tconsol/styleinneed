import client from './client';

export const authApi = {
  login: (email: string, password: string, totp?: string) =>
    client.post('/auth/login', { email, password, ...(totp ? { totp } : {}) }),
  logout: (refreshToken: string) => client.post('/auth/logout', { refreshToken }),
  getMe: () => client.get('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string }) => client.patch('/auth/me', data),
  requestEmailChange: (newEmail: string) => client.post('/auth/change-email/request', { newEmail }),
  verifyEmailChange: (otp: string) => client.post('/auth/change-email/verify', { otp }),
  changePassword: (currentPassword: string, newPassword: string) =>
    client.patch('/auth/change-password', { currentPassword, newPassword }),
};

export const twoFactorApi = {
  status: () => client.get('/auth/2fa/status'),
  setup: () => client.post('/auth/2fa/setup'),
  enable: (token: string) => client.post('/auth/2fa/enable', { token }),
  disable: (password: string, token: string) => client.post('/auth/2fa/disable', { password, token }),
  regenerateRecoveryCodes: (token: string) => client.post('/auth/2fa/recovery-codes', { token }),
};

export const dashboardApi = {
  getStats: () => client.get('/admin/dashboard'),
  getRevenue: (period?: string) => client.get('/admin/analytics/revenue', { params: { period } }),
  getTopProducts: () => client.get('/admin/analytics/top-products'),
  getCustomerAnalytics: () => client.get('/admin/analytics/customers'),
  getInsights: (days?: number) => client.get('/admin/analytics/insights', { params: { days } }),
  getSystemHealth: () => client.get('/admin/system-health'),
};

export const productApi = {
  getAll: (params?: object) => client.get('/admin/products', { params }),
  getById: (id: string) => client.get(`/admin/products/${id}`),
  getFilterOptions: () => client.get('/admin/products/filters'),
  create: (data: object) => client.post('/products', data),
  update: (id: string, data: object) => client.patch(`/products/${id}`, data),
  delete: (id: string) => client.delete(`/products/${id}`),
  uploadImages: (files: FormData) => client.post('/products/upload/images', files, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteImage: (url: string) => client.delete('/products/upload/image', { data: { url } }),
  bulkTemplate: (type: string) => client.get('/products/bulk/template', { params: { type }, responseType: 'blob' }),
  bulkUpload: (data: FormData) => client.post('/products/bulk/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const categoryApi = {
  getAll: () => client.get('/catalog/categories', { params: { includeInactive: true } }),
  create: (data: object) => client.post('/catalog/categories', data),
  update: (id: string, data: object) => client.patch(`/catalog/categories/${id}`, data),
  delete: (id: string) => client.delete(`/catalog/categories/${id}`),
  uploadImage: (file: FormData) => client.post('/catalog/categories/upload', file, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteImage: (url: string) => client.delete('/catalog/categories/upload', { data: { url } }),
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

export const ctaLinkApi = {
  getAll: () => client.get('/catalog/cta-links', { params: { includeInactive: true } }),
  create: (data: object) => client.post('/catalog/cta-links', data),
  update: (id: string, data: object) => client.patch(`/catalog/cta-links/${id}`, data),
  delete: (id: string) => client.delete(`/catalog/cta-links/${id}`),
};

export const orderApi = {
  getAll: (params?: object) => client.get('/admin/orders', { params }),
  getById: (id: string) => client.get(`/admin/orders/${id}`),
  updateStatus: (id: string, data: object) => client.patch(`/admin/orders/${id}/status`, data),
  delete: (id: string) => client.delete(`/admin/orders/${id}`),
  exportCsv: (params?: object) => client.get('/admin/orders/export', { params, responseType: 'blob' }),
  bookShipment: (id: string, data?: object) => client.post(`/admin/orders/${id}/ship`, data || {}),
  getTracking: (id: string) => client.get(`/admin/orders/${id}/tracking`),
};

export const customerApi = {
  getAll: (params?: object) => client.get('/admin/users', { params }),
  getById: (id: string) => client.get(`/admin/users/${id}`),
  updateRole: (id: string, data: object) => client.patch(`/admin/users/${id}`, data),
  delete: (id: string) => client.delete(`/admin/users/${id}`),
  exportCsv: (params?: object) => client.get('/admin/users/export', { params, responseType: 'blob' }),
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
  create: (data: object) => client.post('/blogs', data),
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
  broadcastPromotion: (data: object) => client.post('/newsletter/broadcast-promotion', data),
  delete: (id: string) => client.delete(`/newsletter/subscribers/${id}`),
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
  retryRefund: (id: string) => client.post(`/returns/${id}/refund/retry`),
};

export const inventoryApi = {
  list: (params?: object) => client.get('/inventory', { params }),
  summary: () => client.get('/inventory/summary'),
  adjust: (data: object) => client.post('/inventory/adjust', data),
};

export const emailMarketingApi = {
  getAudience: (params?: object) => client.get('/email-marketing/audience', { params }),
  exportAudience: () => client.get('/email-marketing/audience/export', { responseType: 'blob' }),
  send: (data: object) => client.post('/email-marketing/send', data),
  importTemplate: () => client.get('/email-marketing/import/template', { responseType: 'blob' }),
  importContacts: (form: FormData) => client.post('/email-marketing/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listImported: (params?: object) => client.get('/email-marketing/imported', { params }),
  deleteImported: (data: object) => client.delete('/email-marketing/imported', { data }),
};

export const staffApi = {
  getFeatures: () => client.get('/staff/features'),
  listRoles: () => client.get('/staff/roles'),
  createRole: (data: object) => client.post('/staff/roles', data),
  updateRole: (id: string, data: object) => client.patch(`/staff/roles/${id}`, data),
  deleteRole: (id: string) => client.delete(`/staff/roles/${id}`),
  list: (params?: object) => client.get('/staff', { params }),
  create: (data: object) => client.post('/staff', data),
  update: (id: string, data: object) => client.patch(`/staff/${id}`, data),
  resetPassword: (id: string, data?: object) => client.post(`/staff/${id}/reset-password`, data || {}),
  resetTwoFactor: (id: string) => client.post(`/staff/${id}/reset-2fa`),
  remove: (id: string) => client.delete(`/staff/${id}`),
};

export const whatsappApi = {
  getAudience: (params?: object) => client.get('/whatsapp/audience', { params }),
  exportAudience: (params?: object) => client.get('/whatsapp/audience/export', { params, responseType: 'blob' }),
  importTemplate: () => client.get('/whatsapp/import/template', { responseType: 'blob' }),
  importContacts: (form: FormData) => client.post('/whatsapp/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listImported: (params?: object) => client.get('/whatsapp/imported', { params }),
  deleteImported: (data: object) => client.delete('/whatsapp/imported', { data }),
  sendTest: (data: object) => client.post('/whatsapp/test', data),
  send: (data: object) => client.post('/whatsapp/send', data),
  metaTemplates: () => client.get('/whatsapp/meta-templates'),
  listTemplates: (params?: object) => client.get('/whatsapp/templates', { params }),
  createTemplate: (data: object) => client.post('/whatsapp/templates', data),
  updateTemplate: (id: string, data: object) => client.patch(`/whatsapp/templates/${id}`, data),
  deleteTemplate: (id: string) => client.delete(`/whatsapp/templates/${id}`),
  duplicateTemplate: (id: string) => client.post(`/whatsapp/templates/${id}/duplicate`),
  uploadMedia: (form: FormData) => client.post('/whatsapp/media', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listCampaigns: (params?: object) => client.get('/whatsapp/campaigns', { params }),
  deleteCampaign: (id: string) => client.delete(`/whatsapp/campaigns/${id}`),
  deleteCampaigns: (data: object) => client.delete('/whatsapp/campaigns', { data }),
  getCampaign: (id: string) => client.get(`/whatsapp/campaigns/${id}`),
  listOptOuts: (params?: object) => client.get('/whatsapp/opt-outs', { params }),
  addOptOuts: (data: object) => client.post('/whatsapp/opt-outs', data),
  removeOptOuts: (ids: string[]) => client.delete('/whatsapp/opt-outs', { data: { ids } }),
};

export const walletApi = {
  listGiftCards: (params?: object) => client.get('/wallet/gift-cards', { params }),
  listRecipients: (params?: object) => client.get('/wallet/gift-cards/recipients', { params }),
  createGiftCards: (data: object) => client.post('/wallet/gift-cards', data),
  deactivateGiftCard: (id: string) => client.patch(`/wallet/gift-cards/${id}/deactivate`),
  resendGiftCard: (id: string, email?: string) => client.post(`/wallet/gift-cards/${id}/resend`, email ? { email } : {}),
  adjust: (data: object) => client.post('/wallet/adjust', data),
  getUserWallet: (id: string) => client.get(`/wallet/user/${id}`),
};

export const cmsApi = {
  list: () => client.get('/cms'),
  get: (key: string) => client.get(`/cms/${key}`),
  upsert: (key: string, data: object) => client.put(`/cms/${key}`, data),
  uploadImage: (file: FormData) => client.post('/cms/upload', file, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const auditApi = {
  getLogs: (params?: object) => client.get('/admin/audit-logs', { params }),
};

export const providerApi = {
  getAll: (params?: object) => client.get('/providers', { params }),
  getAllSimple: () => client.get('/providers/all'),
  getFeatures: () => client.get('/providers/features'),
  getMine: () => client.get('/providers/me'),
  updateMine: (data: object) => client.patch('/providers/me', data),
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

export const settingsApi = {
  get: () => client.get('/settings/admin'),
  update: (data: object) => client.patch('/settings', data),
  refreshRate: () => client.post('/settings/refresh-rate'),
};

export const themeApi = {
  getActive: () => client.get('/settings/theme'),
  getAll: () => client.get('/settings/themes'),
  setActive: (key: string) => client.put('/settings/themes/active', { key }),
  save: (theme: object) => client.put('/settings/themes', theme),
  remove: (key: string) => client.delete(`/settings/themes/${key}`),
  setAppearance: (data: { fontHeading?: string; fontBody?: string; applyToAdmin?: boolean }) =>
    client.put('/settings/appearance', data),
};

export const shippingApi = {
  getAll: () => client.get('/shipping-rates'),
  update: (id: string, data: object) => client.patch(`/shipping-rates/${id}`, data),
  bulkSet: (country: 'US' | 'CA', charge: number) => client.patch('/shipping-rates/bulk', { country, charge }),
};
