import { useQuery } from '@tanstack/react-query';
import { categoryApi, collectionApi, productTypeApi, attributeApi } from '../api';
import type { Category, Collection, ProductType, Attribute } from '../types';

// Catalog config rarely changes — cache 5 min so revisiting pages (or opening
// the product form) doesn't refetch. Mutations call invalidate() to refresh.
const staleTime = 5 * 60_000;

export const CATALOG_KEYS = {
  categories: ['categories'] as const,
  collections: ['collections'] as const,
  productTypes: ['product-types'] as const,
  attributes: ['attributes'] as const,
};

export const useCategories = () =>
  useQuery({ queryKey: CATALOG_KEYS.categories, staleTime, queryFn: () => categoryApi.getAll().then((r) => (r.data.data || []) as Category[]) });

export const useCollections = () =>
  useQuery({ queryKey: CATALOG_KEYS.collections, staleTime, queryFn: () => collectionApi.getAll().then((r) => (r.data.data || []) as Collection[]) });

export const useProductTypes = () =>
  useQuery({ queryKey: CATALOG_KEYS.productTypes, staleTime, queryFn: () => productTypeApi.getAll().then((r) => (r.data.data || []) as ProductType[]) });

export const useAttributes = () =>
  useQuery({ queryKey: CATALOG_KEYS.attributes, staleTime, queryFn: () => attributeApi.getAll().then((r) => (r.data.data || []) as Attribute[]) });
