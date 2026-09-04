import client from './client';
import type { ProductFilters } from '../types';

export const productApi = {
  getProducts: (filters: ProductFilters = {}) =>
    client.get('/products', { params: filters }),

  // `fresh` bypasses the browser's cached copy (product responses carry max-age),
  // used when a live socket event says the product just changed.
  getProductBySlug: (slug: string, fresh = false) =>
    client.get(`/products/${slug}`, fresh ? { params: { _: Date.now() } } : undefined),

  getRelatedProducts: (slug: string) =>
    client.get(`/products/${slug}/related`),

  searchProducts: (q: string, page = 1, limit = 20) =>
    client.get('/products/search', { params: { q, page, limit } }),

  getProductTypes: () => client.get('/catalog/product-types'),

  // filterableOnly=true → just the filter facets (used by the listing sidebar);
  // false → every active attribute, so the detail page can name all specs.
  getAttributes: (filterableOnly = true) =>
    client.get('/catalog/attributes', { params: filterableOnly ? { filterable: true } : {} }),

  getCategories: (withCount = true) => client.get('/catalog/categories', { params: withCount ? { withCount: 'true' } : {} }),

  getCategoryBySlug: (slug: string) =>
    client.get(`/catalog/categories/${slug}`),

  getCollections: (featured?: boolean) =>
    client.get('/catalog/collections', { params: featured ? { featured: true } : {} }),
};
