import 'dotenv/config';
import mongoose from 'mongoose';
import Role from '../models/Role';
import { PROVIDER_FEATURE_KEYS } from '../config/providerFeatures';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/styleinneed_fashions';

/**
 * Starter staff roles, each granted the features its name implies.
 *
 * Seeded once and then owned by the admin — re-running only adds roles that
 * are missing, so edits made in the panel are never overwritten.
 */
const ROLES: { name: string; slug: string; description: string; permissions: string[] }[] = [
  {
    name: 'Catalogue Manager',
    slug: 'catalogue-manager',
    description: 'Builds and maintains the product catalogue — types, attributes, categories and size charts.',
    permissions: ['product-types', 'attributes', 'size-charts', 'categories', 'collections'],
  },
  {
    name: 'Order Manager',
    slug: 'order-manager',
    description: 'Processes orders and handles returns end to end.',
    permissions: ['orders', 'returns', 'customers'],
  },
  {
    name: 'Support Agent',
    slug: 'support-agent',
    description: 'Answers tickets, moderates reviews and looks up customer orders.',
    permissions: ['support', 'reviews', 'customers', 'orders'],
  },
  {
    name: 'Marketing Manager',
    slug: 'marketing-manager',
    description: 'Runs campaigns: promotions, coupons, announcements, newsletter and gift cards.',
    permissions: ['promotions', 'coupons', 'announcements', 'newsletter', 'gift-cards', 'analytics'],
  },
  {
    name: 'Content Editor',
    slug: 'content-editor',
    description: 'Writes blog posts and edits storefront page content.',
    permissions: ['blogs', 'cms', 'reviews'],
  },
  {
    name: 'Store Analyst',
    slug: 'store-analyst',
    description: 'Read-heavy role for reporting — dashboard, analytics and order visibility.',
    permissions: ['dashboard', 'analytics', 'orders'],
  },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected. Seeding staff roles...');

  let created = 0;
  for (const r of ROLES) {
    // Every key must exist in the catalogue, or the role would grant nothing.
    const unknown = r.permissions.filter((k) => !PROVIDER_FEATURE_KEYS.includes(k));
    if (unknown.length) {
      console.warn(`  ! ${r.name}: unknown feature key(s) ${unknown.join(', ')} — skipping those`);
    }
    const permissions = r.permissions.filter((k) => PROVIDER_FEATURE_KEYS.includes(k));

    const existing = await Role.findOne({ slug: r.slug });
    if (existing) {
      console.log(`  = ${r.name} (already exists, left untouched)`);
      continue;
    }
    await Role.create({ ...r, permissions });
    console.log(`  + ${r.name} — ${permissions.length} feature(s)`);
    created += 1;
  }

  console.log(`Done. ${created} role(s) created, ${ROLES.length - created} already present.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
