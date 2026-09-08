import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/product.api';
import type { Category, Collection, ProductType, Attribute, Product } from '../types';

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

/**
 * A few popular products for a product type, used by the navbar mega menu.
 * `enabled` keeps it from firing until the menu is actually opened, and the
 * cache means re-hovering the same tab is instant.
 */
export const useMegaMenuProducts = (productType: string, enabled: boolean) =>
  useQuery({
    queryKey: ['mega-menu-products', productType],
    staleTime,
    enabled: enabled && !!productType,
    queryFn: () =>
      productApi
        .getProducts({ productType, limit: 4, sort: '-ratings.count' })
        .then((r) => (r.data.data || []) as Product[]),
  });
