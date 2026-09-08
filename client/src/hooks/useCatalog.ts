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
export const useMegaMenuProducts = (
  filter: { productType?: string; category?: string; collection?: string },
  enabled: boolean
) =>
  useQuery({
    // Each combination is cached separately, so moving back to a link already
    // hovered shows its products instantly.
    queryKey: ['mega-menu-products', filter.productType || '', filter.category || '', filter.collection || ''],
    staleTime,
    enabled: enabled && !!(filter.productType || filter.collection),
    // `placeholderData` keeps the previous rail on screen while the next one
    // loads, so sliding down a list of links doesn't flash skeletons.
    placeholderData: (prev) => prev,
    queryFn: () =>
      productApi
        .getProducts({ ...filter, limit: 4, sort: '-ratings.count' })
        .then((r) => (r.data.data || []) as Product[]),
  });
