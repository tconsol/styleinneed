import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Attribute, Category, Collection, Product, ProductType, Paginated } from '../types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  category?: string;
  collection?: string;
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  // dynamic attribute filters (slug -> comma-joined values)
  [key: string]: string | number | boolean | undefined;
}

const get = <T,>(url: string, params?: object) =>
  api.get(url, { params }).then((r) => r.data as T);

export const useProducts = (query: ProductQuery = {}) =>
  useQuery({
    queryKey: ['products', query],
    queryFn: () => get<Paginated<Product>>('/products', { limit: 12, ...query }),
  });

export const useProduct = (slug: string) =>
  useQuery({
    queryKey: ['product', slug],
    enabled: !!slug,
    queryFn: () => get<{ data: Product }>(`/products/${slug}`).then((r) => r.data),
  });

const staleTime = 5 * 60_000;

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], staleTime, queryFn: () => get<{ data: Category[] }>('/catalog/categories').then((r) => r.data) });

export const useCollections = () =>
  useQuery({ queryKey: ['collections'], staleTime, queryFn: () => get<{ data: Collection[] }>('/catalog/collections').then((r) => r.data) });

export const useProductTypes = () =>
  useQuery({ queryKey: ['product-types'], staleTime, queryFn: () => get<{ data: ProductType[] }>('/catalog/product-types').then((r) => r.data) });

export const useAttributes = (productType?: string) =>
  useQuery({
    queryKey: ['attributes', productType ?? 'all'],
    staleTime,
    queryFn: () =>
      get<{ data: Attribute[] }>('/catalog/attributes', { filterable: true, productType }).then((r) => r.data),
  });
