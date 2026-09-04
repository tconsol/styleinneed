import 'dotenv/config';
import mongoose from 'mongoose';
import ProductType from '../models/ProductType';
import { ensureSystemCtaLinks, syncProductTypeCtaLink } from '../utils/ctaLinks';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/styleinneed_fashions';

// Seeds the built-in storefront CTA links and one link per existing product
// type, so admins can pick a CTA target from a dropdown. Idempotent.
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected. Seeding CTA links...');

  await ensureSystemCtaLinks();
  console.log('  system links ensured');

  const types = await ProductType.find().lean();
  for (const t of types) {
    await syncProductTypeCtaLink(t as unknown as { _id: mongoose.Types.ObjectId; name: string; slug: string; isActive?: boolean });
    console.log(`  product-type link: ${t.name} -> /products?productType=${t.slug}`);
  }

  console.log(`Done. ${types.length} product-type links synced.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
