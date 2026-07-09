import client from './client';

export const cartApi = {
  getCart: () => client.get('/cart'),

  addToCart: (data: { productId: string; variantSku: string; quantity?: number }) =>
    client.post('/cart/add', data),

  updateCartItem: (productId: string, data: { variantSku: string; quantity: number }) =>
    client.patch(`/cart/item/${productId}`, data),

  removeFromCart: (productId: string, variantSku: string) =>
    client.delete(`/cart/item/${productId}`, { data: { variantSku } }),

  clearCart: () => client.delete('/cart/clear'),
};
