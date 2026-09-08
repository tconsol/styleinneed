import client from './client';

export const orderApi = {
  /** Guest order lookup — the token issued at checkout stands in for a session. */
  getGuestOrder: (id: string, token: string) =>
    client.get(`/orders/guest/${id}`, { params: { token } }),

  createOrder: (data: {
    paymentMethod: string;
    couponCode?: string;
    /** Signed-in shoppers: one of their saved addresses. */
    addressId?: string;
    /** Guests: contact email, address and the locally-held cart lines. */
    email?: string;
    address?: Record<string, unknown>;
    items?: { productId: string; variantSku: string; quantity: number }[];
  }) =>
    client.post('/orders', data),

  getPaymentConfig: () => client.get('/orders/payment-config'),

  // Hosted-checkout verification — server polls the gateway, then creates the
  // Order from the payment session only once the payment is confirmed.
  verifyPayment: (data: { sessionId: string; sessionToken?: string }) =>
    client.post('/orders/verify-payment', data),

  verifyStripePayment: (data: { sessionId: string; sessionToken?: string }) =>
    client.post('/orders/verify-stripe-payment', data),

  getMyOrders: (page = 1, limit = 10) =>
    client.get('/orders/my', { params: { page, limit } }),

  getOrderById: (id: string) =>
    client.get(`/orders/${id}`),

  cancelOrder: (id: string, reason?: string) =>
    client.patch(`/orders/${id}/cancel`, { reason }),

  deleteOrder: (id: string) => client.delete(`/orders/${id}`),
};
