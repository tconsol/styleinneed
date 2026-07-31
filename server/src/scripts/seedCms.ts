import 'dotenv/config';
import mongoose from 'mongoose';
import CmsPage from '../models/CmsPage';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/styleinneed_fashions';

// Flat homepage content — mirrors the client's DEFAULT so the admin CMS editor
// opens fully populated instead of blank. Admin can then edit/upload over these.
const homepage: Record<string, string> = {
  // Hero
  hero_1_label: 'New Collection 2025', hero_1_title: 'Elegance Redefined',
  hero_1_subtitle: 'Discover premium ethnic and western wear curated for the modern Indian woman.',
  hero_1_cta: 'Shop Now', hero_1_cta_href: '/products', hero_1_cta2: 'View Collections', hero_1_cta2_href: '/collections',
  hero_1_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1920&q=80',
  hero_2_label: 'Wedding Collection', hero_2_title: 'Bridal Splendour',
  hero_2_subtitle: 'Handcrafted Kanjeevaram and Banarasi silks for your most precious day.',
  hero_2_cta: 'Explore Bridal', hero_2_cta_href: '/products?search=silk sarees', hero_2_cta2: 'View Lookbook', hero_2_cta2_href: '/blogs',
  hero_2_image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=1920&q=80',
  hero_3_label: 'Festive Season', hero_3_title: 'Celebrate in Style',
  hero_3_subtitle: 'Kurtis, lehengas and co-ords curated for every festive occasion.',
  hero_3_cta: 'Shop Festive', hero_3_cta_href: '/products?collection=festive-collection', hero_3_cta2: 'New Arrivals', hero_3_cta2_href: '/products?isNewArrival=true',
  hero_3_image: 'https://images.unsplash.com/photo-1614093302611-8efc4c438a87?w=1920&q=80',

  // Marquee
  marquee: 'Silk Sarees, Designer Kurtis, Bridal Lehengas, Co-Ord Sets, Festive Collection, Premium Fabrics, Free Shipping ₹999+',

  // Product row titles
  row_new_label: 'Fresh Drops', row_new_title: 'New Arrivals', row_new_subtitle: 'First looks at the latest additions to our collection',
  row_best_label: 'Top Picks', row_best_title: 'Best Sellers', row_best_subtitle: "The pieces our customers can't stop talking about",
  row_trending_label: "What's Hot", row_trending_title: 'Trending Now', row_trending_subtitle: '',

  // Collection banners
  banner_1_label: 'Crafted in Silk', banner_1_title: 'The Wedding Collection',
  banner_1_subtitle: 'Handwoven Kanjeevaram and Banarasi silks, designed for the most precious moments of your life.',
  banner_1_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80',
  banner_1_href: '/products?search=silk sarees', banner_1_cta: 'Explore Wedding Sarees', banner_1_dark: 'true', banner_1_reverse: 'false',
  banner_2_label: 'Festive Season', banner_2_title: 'Celebrate in Full Colour',
  banner_2_subtitle: 'Lehengas, kurta sets, and co-ords curated for Diwali, Navratri, Eid, and every festive occasion.',
  banner_2_image: 'https://images.unsplash.com/photo-1614093302611-8efc4c438a87?w=1000&q=80',
  banner_2_href: '/products?collection=festive', banner_2_cta: 'Shop Festive Wear', banner_2_dark: 'false', banner_2_reverse: 'true',

  // Shop-by-category header
  cat_label: 'Browse', cat_title: 'Shop By Category', cat_subtitle: 'Explore our curated collections across every style and occasion',

  // Featured category banners
  cat_featured_1_title: 'Wedding Collection', cat_featured_1_subtitle: 'Silks & Lehengas',
  cat_featured_1_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', cat_featured_1_href: '/products?collection=wedding-collection',
  cat_featured_2_title: 'New Arrivals', cat_featured_2_subtitle: 'Fresh every week',
  cat_featured_2_image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=600&q=80', cat_featured_2_href: '/products?isNewArrival=true',
  cat_featured_3_title: 'Festive Wear', cat_featured_3_subtitle: 'Season specials',
  cat_featured_3_image: 'https://images.unsplash.com/photo-1614093302611-8efc4c438a87?w=600&q=80', cat_featured_3_href: '/products?collection=festive-collection',

  // Our Story
  story_label: 'Our Story', story_heading: 'Where Heritage\nMeets Modern Elegance',
  story_para1: "Born from a deep love for Indian textiles and craftsmanship, Style In Need Fashions bridges the timeless beauty of traditional weaves with contemporary silhouettes designed for today's woman.",
  story_para2: 'Every piece in our collection tells a story — of skilled artisans, of rich heritage, and of a woman who carries grace in every step she takes.',
  story_image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900&q=80',
  story_years: '12+', story_years_label: 'Years of Crafting Excellence',
  story_stat1_value: '5000+', story_stat1_label: 'Styles',
  story_stat2_value: '50K+', story_stat2_label: 'Customers',
  story_stat3_value: '4.8★', story_stat3_label: 'Rating',
  story_pillar1_title: 'Certified Authentic', story_pillar1_body: 'Every product verified for quality and authenticity by our expert team.',
  story_pillar2_title: 'Sustainably Sourced', story_pillar2_body: 'We work with artisans who use ethical and eco-friendly practices.',
  story_pillar3_title: 'Made with Love', story_pillar3_body: 'Each piece tells the story of a skilled weaver and their craft.',

  // Testimonials
  reviews_label: 'Love from our Customers', reviews_title: 'What Our Customers Say', reviews_subtitle: 'Real stories from real women who chose elegance',
  review_1_name: 'Priya Sharma', review_1_city: 'Mumbai', review_1_product: 'Kanjeevaram Silk Saree',
  review_1_text: 'The silk saree I ordered was absolutely stunning. The fabric quality and weaving is exceptional.',
  review_2_name: 'Anitha Reddy', review_2_city: 'Hyderabad', review_2_product: 'Bridal Lehenga',
  review_2_text: 'Style In Need Fashions is my go-to for festive shopping. The designs are unique and delivery was super fast!',
  review_3_name: 'Meena Krishnan', review_3_city: 'Chennai', review_3_product: 'Cotton Kurti Set',
  review_3_text: "I've bought from many online stores but Style In Need stands apart. The quality is consistent and packaging is beautiful.",
  review_4_name: 'Deepa Nair', review_4_city: 'Kochi', review_4_product: 'Banarasi Silk Saree',
  review_4_text: 'The designer saree collection here is unmatched. Got so many compliments at the wedding. Love Style In Need!',

  // Newsletter
  newsletter_label: 'Stay Connected', newsletter_heading: 'Get Exclusive Access',
  newsletter_body: 'Subscribe for early access to new collections, exclusive offers, styling tips, and festive lookbooks.',
  newsletter_placeholder: 'Enter your email address', newsletter_thank_you: "Thank you! You're now on the list.", newsletter_note: 'No spam, ever. Unsubscribe anytime.',
};

const auth: Record<string, string> = {
  login_eyebrow: 'STYLE IN NEED FASHIONS',
  login_heading: 'Where Heritage\nMeets Elegance',
  login_subtitle: "Discover 5000+ handpicked styles from India's finest weavers and designers.",
  login_image_1: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=80',
  login_image_2: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=900&q=80',
  login_image_3: 'https://images.unsplash.com/photo-1614093302611-8efc4c438a87?w=900&q=80',
  login_stat1_value: '5000+', login_stat1_label: 'Styles',
  login_stat2_value: '50K+', login_stat2_label: 'Customers',
  login_stat3_value: '4.8★', login_stat3_label: 'Rating',
};

const store_info: Record<string, string> = {
  store_name: 'Style In Need Fashions', tagline: 'Where Heritage Meets Modern Elegance',
  support_email: 'support@styleinneedfashions.com', support_phone: '+91 98765 43210',
  instagram: 'https://instagram.com/styleinneedfashions', facebook: 'https://facebook.com/styleinneedfashions',
};

const PAGES: { key: string; title: string; content: Record<string, string> }[] = [
  { key: 'homepage', title: 'Homepage Content', content: homepage },
  { key: 'auth', title: 'Login Page', content: auth },
  { key: 'store_info', title: 'Store Info', content: store_info },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  for (const p of PAGES) {
    // Only fill in keys that don't already exist, so admin edits are never overwritten.
    const existing = await CmsPage.findOne({ key: p.key });
    const merged = { ...p.content, ...(existing?.content as Record<string, string> || {}) };
    await CmsPage.findOneAndUpdate(
      { key: p.key },
      { key: p.key, title: p.title, content: merged },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`Seeded CMS page: ${p.key} (${Object.keys(merged).length} fields)`);
  }

  await mongoose.disconnect();
  console.log('Done');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
