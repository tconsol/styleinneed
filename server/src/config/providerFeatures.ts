/**
 * Extra admin-panel features an admin can grant to a provider (supplier) login.
 *
 * Providers ALWAYS get: their own products, their business profile, and the
 * change-password page — those aren't listed here. Everything below is opt-in
 * per provider, ticked by the admin on the Providers page.
 *
 * `key` is what's stored on the user + checked by `adminOrFeature()`.
 * `href` is the admin route it unlocks (used to build their sidebar).
 */
export interface ProviderFeature {
  key: string;
  label: string;
  href: string;
  section: string;
  description: string;
}

export const PROVIDER_FEATURES: ProviderFeature[] = [
  { key: 'dashboard',     label: 'Dashboard',      href: '/',                section: 'Overview', description: 'Store overview & KPI tiles' },
  { key: 'analytics',     label: 'Analytics',      href: '/analytics',       section: 'Overview', description: 'Revenue & top-product charts' },
  { key: 'product-types', label: 'Product Types',  href: '/product-types',   section: 'Catalog',  description: 'Create/edit product types' },
  { key: 'attributes',    label: 'Attributes',     href: '/attributes',      section: 'Catalog',  description: 'Manage variant & product attributes' },
  { key: 'size-charts',   label: 'Size Charts',    href: '/size-charts',     section: 'Catalog',  description: 'Create and edit size charts' },
  { key: 'categories',    label: 'Categories',     href: '/categories',      section: 'Catalog',  description: 'Manage categories' },
  { key: 'collections',   label: 'Collections',    href: '/collections',     section: 'Catalog',  description: 'Manage collections' },
  { key: 'orders',        label: 'Orders',         href: '/orders',          section: 'Commerce', description: 'View and update customer orders' },
  { key: 'returns',       label: 'Returns',        href: '/returns',         section: 'Commerce', description: 'Handle return requests' },
  { key: 'reviews',       label: 'Reviews',        href: '/reviews',         section: 'Content',  description: 'Moderate product reviews' },
  { key: 'promotions',    label: 'Promotions',     href: '/promotions',      section: 'Marketing', description: 'Create sales & campaigns' },
  { key: 'coupons',       label: 'Coupons',        href: '/coupons',         section: 'Marketing', description: 'Create discount coupons' },
  { key: 'support',       label: 'Support',        href: '/support',         section: 'System',   description: 'Respond to support tickets' },
];

export const PROVIDER_FEATURE_KEYS = PROVIDER_FEATURES.map((f) => f.key);

/** Drop anything that isn't a known feature key (admin input is untrusted). */
export const sanitizeFeatures = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(String).filter((k) => PROVIDER_FEATURE_KEYS.includes(k)))];
};
