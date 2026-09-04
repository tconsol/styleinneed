import CtaLink from '../models/CtaLink';
import { Types } from 'mongoose';

// Built-in storefront destinations, seeded so admins can pick a CTA target
// without typing raw URLs. Kept in sync via ensureSystemCtaLinks().
export const SYSTEM_CTA_LINKS = [
  { label: 'Home', url: '/', group: 'General', sortOrder: 0 },
  { label: 'Shop All', url: '/products', group: 'Shop', sortOrder: 1 },
  { label: 'Sale', url: '/sale', group: 'Shop', sortOrder: 2 },
  { label: 'New Arrivals', url: '/products?isNewArrival=true', group: 'Shop', sortOrder: 3 },
  { label: 'Best Sellers', url: '/products?isBestSeller=true', group: 'Shop', sortOrder: 4 },
  { label: 'Trending', url: '/products?isTrending=true', group: 'Shop', sortOrder: 5 },
  { label: 'Collections', url: '/collections', group: 'Shop', sortOrder: 6 },
  { label: 'Blog', url: '/blogs', group: 'General', sortOrder: 7 },
  { label: 'Wishlist', url: '/wishlist', group: 'Account', sortOrder: 8 },
];

// Upsert the built-in links (idempotent — safe to call on boot and re-seed).
export async function ensureSystemCtaLinks(): Promise<void> {
  await Promise.all(
    SYSTEM_CTA_LINKS.map((l) =>
      CtaLink.updateOne(
        { source: 'system', url: l.url },
        { $set: { label: l.label, group: l.group, sortOrder: l.sortOrder, isActive: true, source: 'system' } },
        { upsert: true }
      )
    )
  );
}

// Create/update the auto-managed CTA link for a product type.
export async function syncProductTypeCtaLink(type: {
  _id: Types.ObjectId | string;
  name: string;
  slug: string;
  isActive?: boolean;
}): Promise<void> {
  await CtaLink.updateOne(
    { source: 'productType', refId: type._id },
    {
      $set: {
        label: type.name,
        url: `/products?productType=${type.slug}`,
        group: 'Product Types',
        source: 'productType',
        refId: type._id,
        isActive: type.isActive !== false,
      },
    },
    { upsert: true }
  );
}

export async function removeProductTypeCtaLink(refId: Types.ObjectId | string): Promise<void> {
  await CtaLink.deleteOne({ source: 'productType', refId });
}
