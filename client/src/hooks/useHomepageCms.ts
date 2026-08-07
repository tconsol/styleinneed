import { useEffect, useState } from 'react';
import { cmsApi } from '../api/misc.api';
import { socket, SOCKET_EVENTS } from '../lib/socket';

export interface HeroCmsSlide {
  label: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  cta2: string;
  cta2Href: string;
  image: string;
}

export interface BannerCms {
  label: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  cta: string;
  dark: boolean;
  reverse: boolean;
}

export interface FashionStoryCms {
  label: string;
  heading: string;
  para1: string;
  para2: string;
  image: string;
  years: string;
  yearsLabel: string;
  stat1Value: string; stat1Label: string;
  stat2Value: string; stat2Label: string;
  stat3Value: string; stat3Label: string;
  pillar1Title: string; pillar1Body: string;
  pillar2Title: string; pillar2Body: string;
  pillar3Title: string; pillar3Body: string;
}

export interface TestimonialCms {
  name: string;
  city: string;
  product: string;
  text: string;
  rating: number;
}

export interface NewsletterCms {
  label: string;
  heading: string;
  body: string;
  placeholder: string;
  thankYou: string;
  note: string;
}

export interface SectionHeaderCms {
  label: string;
  title: string;
  subtitle: string;
}

export interface HomepageCms {
  hero: HeroCmsSlide[];
  banners: BannerCms[];
  fashionStory: FashionStoryCms;
  testimonials: TestimonialCms[];
  newsletter: NewsletterCms;
  marquee: string[];
  rowNew: SectionHeaderCms;
  rowBest: SectionHeaderCms;
  rowTrending: SectionHeaderCms;
  categoryHeader: SectionHeaderCms;
  reviewsHeader: SectionHeaderCms;
}

const DEFAULT: HomepageCms = {
  hero: [
    { label: 'New Collection 2025', title: 'Elegance Redefined', subtitle: 'Discover premium ethnic and western wear curated for the modern Indian woman.', cta: 'Shop Now', ctaHref: '/products', cta2: 'View Collections', cta2Href: '/collections', image: '' },
    { label: 'Wedding Collection', title: 'Bridal Splendour', subtitle: 'Handcrafted Kanjeevaram and Banarasi silks for your most precious day.', cta: 'Explore Bridal', ctaHref: '/products?search=silk sarees', cta2: 'View Lookbook', cta2Href: '/blogs', image: '' },
    { label: 'Festive Season', title: 'Celebrate in Style', subtitle: 'Kurtis, lehengas and co-ords curated for every festive occasion.', cta: 'Shop Festive', ctaHref: '/products?collection=festive-collection', cta2: 'New Arrivals', cta2Href: '/products?isNewArrival=true', image: '' },
  ],
  banners: [
    { label: 'Crafted in Silk', title: 'The Wedding Collection', subtitle: 'Handwoven Kanjeevaram and Banarasi silks, designed for the most precious moments of your life.', image: '', href: '/products?search=silk sarees', cta: 'Explore Wedding Sarees', dark: true, reverse: false },
    { label: 'Festive Season', title: 'Celebrate in Full Colour', subtitle: 'Lehengas, kurta sets, and co-ords curated for Diwali, Navratri, Eid, and every festive occasion.', image: '', href: '/products?collection=festive', cta: 'Shop Festive Wear', dark: false, reverse: true },
  ],
  fashionStory: {
    label: 'Our Story', heading: 'Where Heritage\nMeets Modern Elegance',
    para1: 'Born from a deep love for Indian textiles and craftsmanship, Style In Need Fashions bridges the timeless beauty of traditional weaves with contemporary silhouettes designed for today\'s woman.',
    para2: 'Every piece in our collection tells a story — of skilled artisans, of rich heritage, and of a woman who carries grace in every step she takes.',
    image: '',
    years: '12+', yearsLabel: 'Years of Crafting Excellence',
    stat1Value: '5000+', stat1Label: 'Styles',
    stat2Value: '50K+', stat2Label: 'Customers',
    stat3Value: '4.8★', stat3Label: 'Rating',
    pillar1Title: 'Certified Authentic', pillar1Body: 'Every product verified for quality and authenticity by our expert team.',
    pillar2Title: 'Sustainably Sourced', pillar2Body: 'We work with artisans who use ethical and eco-friendly practices.',
    pillar3Title: 'Made with Love', pillar3Body: 'Each piece tells the story of a skilled weaver and their craft.',
  },
  testimonials: [
    { name: 'Priya Sharma', city: 'Mumbai', product: 'Kanjeevaram Silk Saree', text: 'The silk saree I ordered was absolutely stunning. The fabric quality and weaving is exceptional.', rating: 5 },
    { name: 'Anitha Reddy', city: 'Hyderabad', product: 'Bridal Lehenga', text: 'Style In Need Fashions is my go-to for festive shopping. The designs are unique and delivery was super fast!', rating: 5 },
    { name: 'Meena Krishnan', city: 'Chennai', product: 'Cotton Kurti Set', text: 'I\'ve bought from many online stores but Style In Need stands apart. The quality is consistent and packaging is beautiful.', rating: 5 },
    { name: 'Deepa Nair', city: 'Kochi', product: 'Banarasi Silk Saree', text: 'The designer saree collection here is unmatched. Got so many compliments at the wedding. Love Style In Need!', rating: 5 },
    { name: 'Kavya Iyer', city: 'Bengaluru', product: 'Co-Ord Set', text: 'The co-ord sets are so trendy yet elegant. Fits perfectly and the colour was exactly as shown on the site.', rating: 5 },
    { name: 'Ritu Malhotra', city: 'Delhi', product: 'Festive Kurti', text: 'Bought three kurtis for Navratri — all gorgeous. The stitching, the fabric, the fall — everything is premium.', rating: 5 },
    { name: 'Sunita Rao', city: 'Pune', product: 'Designer Saree', text: 'Beautiful packaging and even more beautiful sarees. The draping guide they sent was a lovely touch.', rating: 5 },
    { name: 'Lakshmi Menon', city: 'Trivandrum', product: 'Bridal Collection', text: 'My bridal lehenga was a dream! The craftsmanship and attention to detail are beyond words.', rating: 5 },
  ],
  newsletter: {
    label: 'Stay Connected', heading: 'Get Exclusive Access',
    body: 'Subscribe for early access to new collections, exclusive offers, styling tips, and festive lookbooks.',
    placeholder: 'Enter your email address', thankYou: "Thank you! You're now on the list.", note: 'No spam, ever. Unsubscribe anytime.',
  },
  marquee: ['Silk Sarees', 'Designer Kurtis', 'Bridal Lehengas', 'Co-Ord Sets', 'Festive Collection', 'Premium Fabrics', 'Free Shipping ₹999+'],
  rowNew: { label: 'Fresh Drops', title: 'New Arrivals', subtitle: 'First looks at the latest additions to our collection' },
  rowBest: { label: 'Top Picks', title: 'Best Sellers', subtitle: "The pieces our customers can't stop talking about" },
  rowTrending: { label: "What's Hot", title: 'Trending Now', subtitle: '' },
  categoryHeader: { label: 'Browse', title: 'Shop By Category', subtitle: 'Explore our curated collections across every style and occasion' },
  reviewsHeader: { label: 'Love from our Customers', title: 'What Our Customers Say', subtitle: 'Real stories from real women who chose elegance' },
};

// Build a section header from CMS keys, falling back to defaults per-field.
function header(c: Record<string, string>, prefix: string, def: SectionHeaderCms): SectionHeaderCms {
  return {
    label: c[`${prefix}_label`] || def.label,
    title: c[`${prefix}_title`] || def.title,
    subtitle: c[`${prefix}_subtitle`] ?? def.subtitle,
  };
}

// How many items a repeatable section has: explicit `<prefix>_count`, else scan
// by the presence suffix (supports admin-added/removed entries).
function countOf(c: Record<string, string>, prefix: string, presence: string, max = 30): number {
  const explicit = Number(c[`${prefix}_count`]);
  if (explicit > 0) return explicit;
  let n = 0;
  for (let i = 1; i <= max; i++) if (c[`${prefix}_${i}_${presence}`]) n = i;
  return n;
}

function parseCms(c: Record<string, string>): Partial<HomepageCms> {
  const out: Partial<HomepageCms> = {};

  const hero: HeroCmsSlide[] = [];
  for (let n = 1; n <= countOf(c, 'hero', 'label'); n++) {
    if (!c[`hero_${n}_label`] && !c[`hero_${n}_title`]) continue;
    hero.push({
      label: c[`hero_${n}_label`] || '',
      title: c[`hero_${n}_title`] || '',
      subtitle: c[`hero_${n}_subtitle`] || '',
      cta: c[`hero_${n}_cta`] || 'Shop Now',
      ctaHref: c[`hero_${n}_cta_href`] || '/products',
      cta2: c[`hero_${n}_cta2`] || '',
      cta2Href: c[`hero_${n}_cta2_href`] || '/',
      image: c[`hero_${n}_image`] || '',
    });
  }
  if (hero.length) out.hero = hero;

  const banners: BannerCms[] = [];
  for (let n = 1; n <= countOf(c, 'banner', 'title'); n++) {
    if (!c[`banner_${n}_title`]) continue;
    banners.push({
      label: c[`banner_${n}_label`] || '',
      title: c[`banner_${n}_title`] || '',
      subtitle: c[`banner_${n}_subtitle`] || '',
      image: c[`banner_${n}_image`] || '',
      href: c[`banner_${n}_href`] || '/products',
      cta: c[`banner_${n}_cta`] || 'Shop Now',
      dark: c[`banner_${n}_dark`] === 'true',
      reverse: c[`banner_${n}_reverse`] === 'true',
    });
  }
  if (banners.length) out.banners = banners;

  if (c.story_heading) {
    out.fashionStory = {
      label: c.story_label || DEFAULT.fashionStory.label,
      heading: c.story_heading,
      para1: c.story_para1 || DEFAULT.fashionStory.para1,
      para2: c.story_para2 || DEFAULT.fashionStory.para2,
      image: c.story_image || '',
      years: c.story_years || DEFAULT.fashionStory.years,
      yearsLabel: c.story_years_label || DEFAULT.fashionStory.yearsLabel,
      stat1Value: c.story_stat1_value || DEFAULT.fashionStory.stat1Value,
      stat1Label: c.story_stat1_label || DEFAULT.fashionStory.stat1Label,
      stat2Value: c.story_stat2_value || DEFAULT.fashionStory.stat2Value,
      stat2Label: c.story_stat2_label || DEFAULT.fashionStory.stat2Label,
      stat3Value: c.story_stat3_value || DEFAULT.fashionStory.stat3Value,
      stat3Label: c.story_stat3_label || DEFAULT.fashionStory.stat3Label,
      pillar1Title: c.story_pillar1_title || DEFAULT.fashionStory.pillar1Title,
      pillar1Body: c.story_pillar1_body || DEFAULT.fashionStory.pillar1Body,
      pillar2Title: c.story_pillar2_title || DEFAULT.fashionStory.pillar2Title,
      pillar2Body: c.story_pillar2_body || DEFAULT.fashionStory.pillar2Body,
      pillar3Title: c.story_pillar3_title || DEFAULT.fashionStory.pillar3Title,
      pillar3Body: c.story_pillar3_body || DEFAULT.fashionStory.pillar3Body,
    };
  }

  const testimonials: TestimonialCms[] = [];
  for (let n = 1; n <= countOf(c, 'review', 'name'); n++) {
    if (!c[`review_${n}_name`]) continue;
    testimonials.push({
      name: c[`review_${n}_name`],
      city: c[`review_${n}_city`] || '',
      product: c[`review_${n}_product`] || '',
      text: c[`review_${n}_text`] || '',
      rating: 5,
    });
  }
  if (testimonials.length) out.testimonials = testimonials;

  if (c.newsletter_heading) {
    out.newsletter = {
      label: c.newsletter_label || DEFAULT.newsletter.label,
      heading: c.newsletter_heading,
      body: c.newsletter_body || DEFAULT.newsletter.body,
      placeholder: c.newsletter_placeholder || DEFAULT.newsletter.placeholder,
      thankYou: c.newsletter_thank_you || DEFAULT.newsletter.thankYou,
      note: c.newsletter_note || DEFAULT.newsletter.note,
    };
  }

  if (c.marquee) {
    out.marquee = c.marquee.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Section headers (product rows, category, reviews) — each field falls back individually.
  out.rowNew = header(c, 'row_new', DEFAULT.rowNew);
  out.rowBest = header(c, 'row_best', DEFAULT.rowBest);
  out.rowTrending = header(c, 'row_trending', DEFAULT.rowTrending);
  out.categoryHeader = header(c, 'cat', DEFAULT.categoryHeader);
  out.reviewsHeader = header(c, 'reviews', DEFAULT.reviewsHeader);

  return out;
}

export function useHomepageCms(): HomepageCms {
  const [cms, setCms] = useState<HomepageCms>(DEFAULT);

  useEffect(() => {
    const load = (fresh = false) => {
      cmsApi.getPage('homepage', fresh).then((res) => {
        const content = res.data.data?.content;
        if (content && typeof content === 'object' && Object.keys(content).length > 0) {
          const parsed = parseCms(content as Record<string, string>);
          setCms({ ...DEFAULT, ...parsed });
        }
      }).catch(() => {});
    };
    load();

    // Live refresh when the admin saves the homepage CMS.
    const onCms = (p: { key?: string }) => { if (!p || p.key === 'homepage') load(true); };
    socket.on(SOCKET_EVENTS.cmsUpdated, onCms);
    return () => { socket.off(SOCKET_EVENTS.cmsUpdated, onCms); };
  }, []);

  return cms;
}
