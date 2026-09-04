import 'dotenv/config';
import mongoose from 'mongoose';
import Attribute from '../models/Attribute';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/styleinneed_fashions';

// Meesho-style jewellery metals/finishes — a colour-swatch variant attribute so
// jewellery products get metal variants (like clothing gets colour/size).
const metalOptions = [
  ['Gold', 'gold', '#D4AF37'],
  ['Rose Gold', 'rose-gold', '#B76E79'],
  ['White Gold', 'white-gold', '#E8E8E8'],
  ['Silver', 'silver', '#C0C0C0'],
  ['Sterling Silver', 'sterling-silver', '#ACACAC'],
  ['Oxidised Silver', 'oxidised-silver', '#4A4A4A'],
  ['German Silver', 'german-silver', '#B8B8B8'],
  ['Platinum', 'platinum', '#E5E4E2'],
  ['Brass', 'brass', '#B5A642'],
  ['Copper', 'copper', '#B87333'],
  ['Bronze', 'bronze', '#CD7F32'],
  ['Antique Gold', 'antique-gold', '#C9A44C'],
  ['Kundan', 'kundan', '#E6C200'],
  ['Meenakari', 'meenakari', '#1E6FBA'],
  ['Pearl', 'pearl', '#F0EAD6'],
  ['American Diamond', 'american-diamond', '#EAF4FF'],
  ['Rhodium', 'rhodium', '#E2E2E2'],
  ['Stainless Steel', 'stainless-steel', '#BFC1C2'],
] as const;

// Product-level: purity/karat (a chips attribute, not a variant swatch).
const purityOptions = ['24K', '22K', '18K', '14K', '925 Sterling', 'Gold Plated', 'Silver Plated', 'Rose Gold Plated'];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  await Attribute.findOneAndUpdate(
    { slug: 'metal' },
    {
      name: 'Metal', slug: 'metal', level: 'variant', inputType: 'color',
      productTypes: ['jewellery'], isFilterable: true, isActive: true, sortOrder: 1,
      options: metalOptions.map(([label, value, hex], i) => ({ label, value, hex, sortOrder: i })),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Seeded "Metal" variant attribute (${metalOptions.length} options) for jewellery`);

  await Attribute.findOneAndUpdate(
    { slug: 'purity' },
    {
      name: 'Purity', slug: 'purity', level: 'product', inputType: 'chips',
      productTypes: ['jewellery'], isFilterable: true, isActive: true, sortOrder: 2,
      options: purityOptions.map((v, i) => ({ label: v, value: v.toLowerCase().replace(/\s+/g, '-'), sortOrder: i })),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Seeded "Purity" product attribute (${purityOptions.length} options) for jewellery`);

  await mongoose.disconnect();
  console.log('Done');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
