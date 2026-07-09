import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/product.api';
import type { Category, Collection, ProductType, Attribute } from '../types';

// Shared, cached catalog queries. React Query dedupes across components
// (Header + listing page) so these endpoints are fetched once, not per-mount.
const staleTime = 5 * 60_000;

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], staleTime, queryFn: () => productApi.getCategories().then((r) => (r.data.data || []) as Category[]) });

export const useCollections = () =>
  useQuery({ queryKey: ['collections'], staleTime, queryFn: () => productApi.getCollections().then((r) => (r.data.data || []) as Collection[]) });

export const useProductTypes = () =>
  useQuery({ queryKey: ['product-types'], staleTime, queryFn: () => productApi.getProductTypes().then((r) => (r.data.data || []) as ProductType[]) });

export const useAttributes = () =>
  useQuery({ queryKey: ['attributes'], staleTime, queryFn: () => productApi.getAttributes().then((r) => (r.data.data || []) as Attribute[]) });
