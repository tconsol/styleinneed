import client from './client';
import type { ProductFilters } from '../types';

export const productApi = {
  getProducts: (filters: ProductFilters = {}) =>
    client.get('/products', { params: filters }),

  getProductBySlug: (slug: string) =>
    client.get(`/products/${slug}`),

  getRelatedProducts: (slug: string) =>
    client.get(`/products/${slug}/related`),

  searchProducts: (q: string, page = 1, limit = 20) =>
    client.get('/products/search', { params: { q, page, limit } }),

  getProductTypes: () => client.get('/catalog/product-types'),

  getAttributes: () => client.get('/catalog/attributes', { params: { filterable: true } }),

  getCategories: (withCount = true) => client.get('/catalog/categories', { params: withCount ? { withCount: 'true' } : {} }),

  getCategoryBySlug: (slug: string) =>
    client.get(`/catalog/categories/${slug}`),

  getCollections: (featured?: boolean) =>
    client.get('/catalog/collections', { params: featured ? { featured: true } : {} }),
};
