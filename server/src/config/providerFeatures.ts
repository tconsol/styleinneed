/**
 * Admin-panel features an admin can grant to a non-admin staff login —
 * a provider (supplier) or a manager.
 *
 * Providers ALWAYS get their own products, business profile and password page;
 * managers start with nothing. Everything below is opt-in and ticked by an
 * admin. Account/role management, wallet adjustments and destructive actions
 * are deliberately absent — those stay admin-only so a grant can never be used
 * to widen access.
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
  { key: 'inventory',     label: 'Inventory',      href: '/inventory',       section: 'Catalog',  description: 'Stock levels, low-stock worklist & bulk restock' },
  { key: 'categories',    label: 'Categories',     href: '/categories',      section: 'Catalog',  description: 'Manage categories' },
  { key: 'collections',   label: 'Collections',    href: '/collections',     section: 'Catalog',  description: 'Manage collections' },
  { key: 'orders',        label: 'Orders',         href: '/orders',          section: 'Commerce', description: 'View and update customer orders' },
  { key: 'returns',       label: 'Returns',        href: '/returns',         section: 'Commerce', description: 'Handle return requests' },
  { key: 'reviews',       label: 'Reviews',        href: '/reviews',         section: 'Content',  description: 'Moderate product reviews' },
  { key: 'promotions',    label: 'Promotions',     href: '/promotions',      section: 'Marketing', description: 'Create sales & campaigns' },
  { key: 'coupons',       label: 'Coupons',        href: '/coupons',         section: 'Marketing', description: 'Create discount coupons' },
  { key: 'support',       label: 'Support',        href: '/support',         section: 'System',   description: 'Respond to support tickets' },
  { key: 'customers',     label: 'Customers',      href: '/customers',       section: 'Commerce', description: 'View customer profiles & order history' },
  { key: 'announcements', label: 'Announcements',  href: '/announcements',   section: 'Marketing', description: 'Site banners & popups' },
  { key: 'newsletter',    label: 'Newsletter',     href: '/newsletter',      section: 'Marketing', description: 'Subscribers & promo broadcasts' },
  { key: 'email-marketing', label: 'Email Marketing', href: '/email-marketing', section: 'Marketing', description: 'Campaigns to the combined customer audience' },
  { key: 'whatsapp-marketing', label: 'WhatsApp Marketing', href: '/whatsapp-marketing', section: 'Marketing', description: 'Broadcast WhatsApp templates to the customer audience' },
  { key: 'gift-cards',    label: 'Gift Cards',     href: '/gift-cards',      section: 'Marketing', description: 'Issue and deactivate gift cards' },
  { key: 'blogs',         label: 'Blog',           href: '/blogs',           section: 'Content',  description: 'Write and publish posts' },
  { key: 'cms',           label: 'CMS Pages',      href: '/cms',             section: 'Content',  description: 'Edit storefront page content' },
];

export const PROVIDER_FEATURE_KEYS = PROVIDER_FEATURES.map((f) => f.key);

/** Drop anything that isn't a known feature key (admin input is untrusted). */
export const sanitizeFeatures = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(String).filter((k) => PROVIDER_FEATURE_KEYS.includes(k)))];
};
