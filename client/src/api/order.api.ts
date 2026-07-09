import client from './client';

export const orderApi = {
  createOrder: (data: { addressId: string; paymentMethod: string; couponCode?: string }) =>
    client.post('/orders', data),

  getPaymentConfig: () => client.get('/orders/payment-config'),

  // Hosted-checkout verification — server polls the gateway by stored id.
  verifyPayment: (data: { orderId: string }) =>
    client.post('/orders/verify-payment', data),

  verifyStripePayment: (data: { orderId: string }) =>
    client.post('/orders/verify-stripe-payment', data),

  getMyOrders: (page = 1, limit = 10) =>
    client.get('/orders/my', { params: { page, limit } }),

  getOrderById: (id: string) =>
    client.get(`/orders/${id}`),

  cancelOrder: (id: string, reason?: string) =>
    client.patch(`/orders/${id}/cancel`, { reason }),
};
