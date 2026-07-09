import client from './client';

export const wishlistApi = {
  getWishlist: () => client.get('/wishlist'),
  toggleWishlist: (productId: string) => client.post(`/wishlist/${productId}/toggle`),
};
