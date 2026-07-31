import { useState, useRef, useEffect } from 'react';
import { Save, Globe, Check, AlertCircle, Building2, Phone, Lock, CornerDownLeft, Truck, Briefcase, Home, LayoutTemplate, Upload, X, ImageIcon, Trash2, Plus, LogIn } from 'lucide-react';
import { cmsApi } from '../../api';
import toast from 'react-hot-toast';

interface GroupItemField {
  suffix: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'link';
  placeholder?: string;
  help?: string;
  rows?: number;
}

interface GroupDef {
  itemLabel: string;   // e.g. "Slide", "Banner"
  presence: string;    // suffix used to detect a non-empty item
  min: number;
  max: number;
  fields: GroupItemField[];
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'richtext' | 'url' | 'email' | 'phone' | 'section' | 'image' | 'link' | 'group';
  placeholder?: string;
  help?: string;
  rows?: number;
  group?: GroupDef;
}

interface PageDef { key: string; title: string; icon: React.ElementType; description: string; fields: FieldDef[]; }

const PAGES: PageDef[] = [
  { key: 'about', title: 'About Us', icon: Building2, description: 'Company story and brand info',
    fields: [
      { key: 'heading', label: 'Main Heading', type: 'text', placeholder: 'Our Story' },
      { key: 'subheading', label: 'Sub Heading', type: 'text', placeholder: 'Where Heritage Meets Modern Elegance' },
      { key: 'body', label: 'Brand Story', type: 'richtext', placeholder: 'Write your brand story here...', rows: 8 },
      { key: 'stat1_value', label: 'Stat 1 Value', type: 'text', placeholder: '5000+' },
      { key: 'stat1_label', label: 'Stat 1 Label', type: 'text', placeholder: 'Products' },
      { key: 'stat2_value', label: 'Stat 2 Value', type: 'text', placeholder: '50K+' },
      { key: 'stat2_label', label: 'Stat 2 Label', type: 'text', placeholder: 'Happy Customers' },
      { key: 'stat3_value', label: 'Stat 3 Value', type: 'text', placeholder: '4.8 Stars' },
      { key: 'stat3_label', label: 'Stat 3 Label', type: 'text', placeholder: 'Average Rating' },
    ],
  },
  { key: 'contact', title: 'Contact Page', icon: Phone, description: 'Contact information',
    fields: [
      { key: 'heading', label: 'Page Heading', type: 'text', placeholder: 'Get in Touch' },
      { key: 'email', label: 'Support Email', type: 'email', placeholder: 'support@styleinneedfashions.com' },
      { key: 'phone', label: 'Phone', type: 'phone', placeholder: '+91 98765 43210' },
      { key: 'whatsapp', label: 'WhatsApp', type: 'phone', placeholder: '+91 98765 43210' },
      { key: 'address', label: 'Office Address', type: 'textarea', placeholder: '123 Fashion St, Hyderabad', rows: 3 },
      { key: 'hours', label: 'Business Hours', type: 'text', placeholder: 'Mon-Sat: 10AM-7PM IST' },
      { key: 'map_embed', label: 'Google Maps Embed URL', type: 'url', placeholder: 'https://maps.google.com/...', help: 'Google Maps > Share > Embed a map > copy src URL' },
    ],
  },
  { key: 'privacy', title: 'Privacy Policy', icon: Lock, description: 'Privacy policy content',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Privacy Policy' },
      { key: 'last_updated', label: 'Last Updated', type: 'text', placeholder: 'June 2025' },
      { key: 'content', label: 'Policy Content', type: 'richtext', placeholder: 'Write your privacy policy...', rows: 18, help: 'Supports HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>' },
    ],
  },
  { key: 'terms', title: 'Terms of Service', icon: Briefcase, description: 'Terms and conditions',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Terms of Service' },
      { key: 'last_updated', label: 'Last Updated', type: 'text', placeholder: 'June 2025' },
      { key: 'content', label: 'Terms Content', type: 'richtext', placeholder: 'Write your terms...', rows: 18 },
    ],
  },
  { key: 'returns', title: 'Return Policy', icon: CornerDownLeft, description: 'Return and refund policy',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Return & Refund Policy' },
      { key: 'return_window', label: 'Return Window', type: 'text', placeholder: '7 days from delivery' },
      { key: 'refund_timeline', label: 'Refund Timeline', type: 'text', placeholder: '5-7 business days' },
      { key: 'content', label: 'Policy Content', type: 'richtext', placeholder: 'Full return policy...', rows: 12 },
    ],
  },
  { key: 'shipping', title: 'Shipping Policy', icon: Truck, description: 'Shipping and delivery info',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Shipping Policy' },
      { key: 'free_threshold', label: 'Free Shipping Threshold', type: 'text', placeholder: 'Rs. 999' },
      { key: 'standard_days', label: 'Standard Delivery', type: 'text', placeholder: '4-7 business days' },
      { key: 'express_days', label: 'Express Delivery', type: 'text', placeholder: '1-3 business days' },
      { key: 'express_charge', label: 'Express Charge', type: 'text', placeholder: 'Rs. 149' },
      { key: 'content', label: 'Full Policy', type: 'richtext', placeholder: 'Detailed shipping info...', rows: 10 },
    ],
  },
  { key: 'careers', title: 'Careers', icon: Briefcase, description: 'Careers page content',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Join Our Team' },
      { key: 'subheading', label: 'Subheading', type: 'text', placeholder: 'Build the future of Indian fashion' },
      { key: 'body', label: 'About Working Here', type: 'richtext', placeholder: 'Company culture...', rows: 5 },
      { key: 'email', label: 'Apply Email', type: 'email', placeholder: 'careers@styleinneedfashions.com' },
      { key: 'openings', label: 'Current Openings', type: 'richtext', placeholder: 'List open positions...', rows: 8 },
    ],
  },
  { key: 'homepage', title: 'Homepage Content', icon: LayoutTemplate, description: 'All home page sections — hero, banners, story, reviews, newsletter',
    fields: [
      // ── HERO ──
      { key: 's_hero', label: 'Hero Slideshow', type: 'section' },
      { key: 'hero', label: 'Hero Slides', type: 'group', group: {
        itemLabel: 'Slide', presence: 'label', min: 1, max: 10,
        fields: [
          { suffix: 'label', label: 'Label', type: 'text', placeholder: 'New Collection 2025', help: 'Small tag shown above the title' },
          { suffix: 'title', label: 'Title', type: 'text', placeholder: 'Elegance Redefined', help: 'Use \\n for a line break' },
          { suffix: 'subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Discover premium ethnic and western wear...', rows: 2 },
          { suffix: 'cta', label: 'Button 1 Text', type: 'text', placeholder: 'Shop Now' },
          { suffix: 'cta_href', label: 'Button 1 Link', type: 'link', placeholder: '/products' },
          { suffix: 'cta2', label: 'Button 2 Text', type: 'text', placeholder: 'View Collections' },
          { suffix: 'cta2_href', label: 'Button 2 Link', type: 'link', placeholder: '/collections' },
          { suffix: 'image', label: 'Background Image', type: 'image' },
        ],
      } },
      // ── MARQUEE ──
      { key: 's_marquee', label: 'Scrolling Marquee', type: 'section' },
      { key: 'marquee', label: 'Marquee Items', type: 'text', placeholder: 'Silk Sarees, Designer Kurtis, Bridal Lehengas', help: 'Comma-separated list of words/phrases that scroll across the page' },
      // ── PRODUCT ROW TITLES ──
      { key: 's_rows', label: 'Product Section Titles', type: 'section' },
      { key: 'row_new_label', label: 'New Arrivals - Label', type: 'text', placeholder: 'Fresh Drops' },
      { key: 'row_new_title', label: 'New Arrivals - Title', type: 'text', placeholder: 'New Arrivals' },
      { key: 'row_new_subtitle', label: 'New Arrivals - Subtitle', type: 'text', placeholder: 'First looks at the latest additions to our collection' },
      { key: 'row_best_label', label: 'Best Sellers - Label', type: 'text', placeholder: 'Top Picks' },
      { key: 'row_best_title', label: 'Best Sellers - Title', type: 'text', placeholder: 'Best Sellers' },
      { key: 'row_best_subtitle', label: 'Best Sellers - Subtitle', type: 'text', placeholder: "The pieces our customers can't stop talking about" },
      { key: 'row_trending_label', label: 'Trending - Label', type: 'text', placeholder: "What's Hot" },
      { key: 'row_trending_title', label: 'Trending - Title', type: 'text', placeholder: 'Trending Now' },
      { key: 'row_trending_subtitle', label: 'Trending - Subtitle', type: 'text', placeholder: 'Optional subtitle' },
      // ── COLLECTION BANNERS ──
      { key: 's_banners', label: 'Collection Banners', type: 'section' },
      { key: 'banner', label: 'Banners', type: 'group', group: {
        itemLabel: 'Banner', presence: 'title', min: 0, max: 10,
        fields: [
          { suffix: 'label', label: 'Label', type: 'text', placeholder: 'Exclusive' },
          { suffix: 'title', label: 'Title', type: 'text', placeholder: 'Wedding Season Collection' },
          { suffix: 'subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Handcrafted silks and brocades...', rows: 2 },
          { suffix: 'image', label: 'Image', type: 'image' },
          { suffix: 'href', label: 'Link', type: 'link', placeholder: '/products?category=sarees' },
          { suffix: 'cta', label: 'Button Text', type: 'text', placeholder: 'Explore Collection' },
          { suffix: 'dark', label: 'Dark overlay? (true/false)', type: 'text', placeholder: 'true' },
          { suffix: 'reverse', label: 'Image on right? (true/false)', type: 'text', placeholder: 'false' },
        ],
      } },
      // ── SHOP BY CATEGORY ──
      { key: 's_catheader', label: 'Shop By Category — Section Title', type: 'section' },
      { key: 'cat_label', label: 'Category - Label', type: 'text', placeholder: 'Browse' },
      { key: 'cat_title', label: 'Category - Title', type: 'text', placeholder: 'Shop By Category' },
      { key: 'cat_subtitle', label: 'Category - Subtitle', type: 'text', placeholder: 'Explore our curated collections across every style and occasion' },
      // ── FEATURED CATEGORIES ──
      { key: 's_catfeatured', label: 'Featured Category Banners', type: 'section' },
      { key: 'cat_featured', label: 'Featured', type: 'group', group: {
        itemLabel: 'Featured', presence: 'title', min: 0, max: 9,
        fields: [
          { suffix: 'title', label: 'Title', type: 'text', placeholder: 'Silk Sarees' },
          { suffix: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'Timeless elegance' },
          { suffix: 'image', label: 'Image', type: 'image' },
          { suffix: 'href', label: 'Link', type: 'link', placeholder: '/products?category=sarees' },
        ],
      } },
      // ── FASHION STORY ──
      { key: 's_story', label: 'Our Story Section', type: 'section' },
      { key: 'story_label', label: 'Section Label', type: 'text', placeholder: 'Our Heritage' },
      { key: 'story_heading', label: 'Heading', type: 'text', placeholder: 'Crafting Elegance\nSince 2019', help: 'Use \\n for line break' },
      { key: 'story_para1', label: 'Paragraph 1', type: 'textarea', placeholder: 'Founded with a passion...', rows: 3 },
      { key: 'story_para2', label: 'Paragraph 2', type: 'textarea', placeholder: 'Every piece in our collection...', rows: 3 },
      { key: 'story_image', label: 'Image URL', type: 'image', placeholder: 'https://...' },
      { key: 'story_years', label: 'Years Value', type: 'text', placeholder: '5+' },
      { key: 'story_years_label', label: 'Years Label', type: 'text', placeholder: 'Years of Craftsmanship' },
      { key: 'story_stat1_value', label: 'Stat 1 Value', type: 'text', placeholder: '5000+' },
      { key: 'story_stat1_label', label: 'Stat 1 Label', type: 'text', placeholder: 'Products' },
      { key: 'story_stat2_value', label: 'Stat 2 Value', type: 'text', placeholder: '50K+' },
      { key: 'story_stat2_label', label: 'Stat 2 Label', type: 'text', placeholder: 'Happy Customers' },
      { key: 'story_stat3_value', label: 'Stat 3 Value', type: 'text', placeholder: '4.8★' },
      { key: 'story_stat3_label', label: 'Stat 3 Label', type: 'text', placeholder: 'Average Rating' },
      { key: 'story_pillar1_title', label: 'Pillar 1 Title', type: 'text', placeholder: 'Award-Winning Quality' },
      { key: 'story_pillar1_body', label: 'Pillar 1 Body', type: 'text', placeholder: 'Recognized for excellence in Indian fashion.' },
      { key: 'story_pillar2_title', label: 'Pillar 2 Title', type: 'text', placeholder: 'Sustainable Practices' },
      { key: 'story_pillar2_body', label: 'Pillar 2 Body', type: 'text', placeholder: 'Ethically sourced fabrics and artisan partnerships.' },
      { key: 'story_pillar3_title', label: 'Pillar 3 Title', type: 'text', placeholder: 'Made with Love' },
      { key: 'story_pillar3_body', label: 'Pillar 3 Body', type: 'text', placeholder: 'Every stitch reflects our passion for fashion.' },
      // ── TESTIMONIALS ──
      { key: 's_reviews', label: 'Customer Reviews', type: 'section' },
      { key: 'reviews_label', label: 'Section - Label', type: 'text', placeholder: 'Love from our Customers' },
      { key: 'reviews_title', label: 'Section - Title', type: 'text', placeholder: 'What Our Customers Say' },
      { key: 'reviews_subtitle', label: 'Section - Subtitle', type: 'text', placeholder: 'Real stories from real women who chose elegance' },
      { key: 'review', label: 'Reviews', type: 'group', group: {
        itemLabel: 'Review', presence: 'name', min: 0, max: 20,
        fields: [
          { suffix: 'name', label: 'Name', type: 'text', placeholder: 'Priya Sharma' },
          { suffix: 'city', label: 'City', type: 'text', placeholder: 'Mumbai' },
          { suffix: 'product', label: 'Product', type: 'text', placeholder: 'Kanjeevaram Silk Saree' },
          { suffix: 'text', label: 'Review Text', type: 'textarea', placeholder: 'The silk saree I ordered was absolutely stunning...', rows: 2 },
        ],
      } },
      // ── NEWSLETTER ──
      { key: 's_newsletter', label: 'Newsletter Section', type: 'section' },
      { key: 'newsletter_label', label: 'Label Tag', type: 'text', placeholder: 'Stay Connected' },
      { key: 'newsletter_heading', label: 'Heading', type: 'text', placeholder: 'Get Exclusive Access' },
      { key: 'newsletter_body', label: 'Body Text', type: 'textarea', placeholder: 'Subscribe for early access to new collections...', rows: 2 },
      { key: 'newsletter_placeholder', label: 'Input Placeholder', type: 'text', placeholder: 'Enter your email address' },
      { key: 'newsletter_thank_you', label: 'Thank You Message', type: 'text', placeholder: "Thank you! You're now on the list." },
      { key: 'newsletter_note', label: 'Fine Print', type: 'text', placeholder: 'No spam, ever. Unsubscribe anytime.' },
    ],
  },
  { key: 'auth', title: 'Login Page', icon: LogIn, description: 'Storefront sign-in / register marketing panel',
    fields: [
      { key: 's_login', label: 'Login — Side Panel', type: 'section' },
      { key: 'login_eyebrow', label: 'Eyebrow Text', type: 'text', placeholder: 'STYLE IN NEED FASHIONS' },
      { key: 'login_heading', label: 'Heading', type: 'text', placeholder: 'Where Heritage\\nMeets Elegance', help: 'Use \\n for a line break' },
      { key: 'login_subtitle', label: 'Subtitle', type: 'textarea', placeholder: "Discover 5000+ handpicked styles from India's finest weavers and designers.", rows: 2 },
      { key: 's_login_images', label: 'Background Images (shown at random)', type: 'section' },
      { key: 'login_image_1', label: 'Image 1', type: 'image' },
      { key: 'login_image_2', label: 'Image 2', type: 'image' },
      { key: 'login_image_3', label: 'Image 3', type: 'image' },
      { key: 's_login_stats', label: 'Stats', type: 'section' },
      { key: 'login_stat1_value', label: 'Stat 1 Value', type: 'text', placeholder: '5000+' },
      { key: 'login_stat1_label', label: 'Stat 1 Label', type: 'text', placeholder: 'Styles' },
      { key: 'login_stat2_value', label: 'Stat 2 Value', type: 'text', placeholder: '50K+' },
      { key: 'login_stat2_label', label: 'Stat 2 Label', type: 'text', placeholder: 'Customers' },
      { key: 'login_stat3_value', label: 'Stat 3 Value', type: 'text', placeholder: '4.8★' },
      { key: 'login_stat3_label', label: 'Stat 3 Label', type: 'text', placeholder: 'Rating' },
    ],
  },
  { key: 'store_info', title: 'Store Info', icon: Home, description: 'General store settings',
    fields: [
      { key: 'store_name', label: 'Store Name', type: 'text', placeholder: 'Style In Need Fashions' },
      { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Where Heritage Meets Modern Elegance' },
      { key: 'support_email', label: 'Support Email', type: 'email', placeholder: 'support@styleinneedfashions.com' },
      { key: 'support_phone', label: 'Support Phone', type: 'phone', placeholder: '+91 98765 43210' },
      { key: 'instagram', label: 'Instagram URL', type: 'url', placeholder: 'https://instagram.com/styleinneedfashions' },
      { key: 'facebook', label: 'Facebook URL', type: 'url', placeholder: 'https://facebook.com/styleinneedfashions' },
    ],
  },
];

// Known client-side destinations, offered as suggestions on link fields so the
// admin doesn't have to memorise route paths. Custom paths are still allowed.
const ROUTES: { path: string; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/products', label: 'All Products' },
  { path: '/products?isNewArrival=true', label: 'New Arrivals' },
  { path: '/products?isBestSeller=true', label: 'Best Sellers' },
  { path: '/products?isTrending=true', label: 'Trending' },
  { path: '/products?isFeatured=true', label: 'Featured' },
  { path: '/products?category=', label: 'Category (append slug)' },
  { path: '/products?collection=', label: 'Collection (append slug)' },
  { path: '/collections', label: 'Collections' },
  { path: '/blogs', label: 'Blog' },
  { path: '/search', label: 'Search' },
  { path: '/wishlist', label: 'Wishlist' },
  { path: '/support', label: 'Support' },
  { path: '/returns', label: 'Returns' },
];

export default function CmsPage() {
  const [selected, setSelected] = useState<string | null>('homepage');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const def = PAGES.find((p) => p.key === selected);

  // Open Homepage by default so the editor is never blank.
  useEffect(() => { void loadPage('homepage'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPage = async (key: string) => {
    setSelected(key);
    setLoading(true);
    setSaved(false);
    try {
      const { data } = await cmsApi.get(key);
      const content = data.data?.content || {};
      const flat: Record<string, string> = {};
      if (typeof content === 'object' && content !== null) {
        Object.entries(content).forEach(([k, v]) => { flat[k] = typeof v === 'string' ? v : String(v); });
      }
      setFieldValues(flat);
    } catch { setFieldValues({}); } finally { setLoading(false); }
  };

  const save = async () => {
    if (!selected || !def) return;
    setSaving(true);
    try {
      await cmsApi.upsert(selected, { title: def.title, content: fieldValues });
      setSaved(true);
      toast.success(`${def.title} saved`);
      setTimeout(() => setSaved(false), 3000);
    } catch {} finally { setSaving(false); }
  };

  const set = (key: string, value: string) => { setFieldValues((p) => ({ ...p, [key]: value })); setSaved(false); };
  const setMany = (updater: (p: Record<string, string>) => Record<string, string>) => { setFieldValues(updater); setSaved(false); };

  return (
    <div className="flex gap-5" style={{ minHeight: '70vh' }}>
      {/* Floating save button — always reachable while scrolling a long page */}
      {selected && def && !loading && (
        <button onClick={save} disabled={saving}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full font-body text-[13px] font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-70"
          style={{ background: saved ? '#10B981' : 'var(--c-primary)', boxShadow: '0 8px 24px rgba(79,70,229,0.35)' }}>
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save Changes'}
        </button>
      )}

      <aside className="w-52 flex-shrink-0">
        <div className="card p-2 sticky top-20">
          <p className="font-body text-[9px] font-bold text-brand-muted uppercase tracking-wider px-3 py-1 mb-1">Pages</p>
          {PAGES.map(({ key, title, icon: Icon }) => (
            <button key={key} onClick={() => loadPage(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 font-body text-[12px] rounded-lg text-left transition-all mb-0.5 ${
                selected === key ? 'bg-primary/10 text-primary font-semibold' : 'text-brand-text hover:bg-brand-bg'
              }`}>
              <Icon size={13} className={selected === key ? 'text-primary' : 'text-brand-muted'} />
              <span className="truncate">{title}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="card flex flex-col items-center justify-center min-h-[400px] text-center">
            <Globe size={36} className="text-brand-border mb-3" />
            <p className="font-body text-sm font-semibold text-brand-text">Select a page to edit</p>
            <p className="font-body text-xs text-brand-muted mt-1">Click any page from the left panel</p>
          </div>
        ) : loading ? (
          <div className="card flex items-center justify-center min-h-[300px]">
            <span className="w-7 h-7 border-2 border-brand-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : def ? (
          <div className="space-y-4">
            <div className="card flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <def.icon size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-body text-sm font-semibold text-brand-text">{def.title}</h2>
                  <p className="font-body text-xs text-brand-muted">{def.description}</p>
                </div>
              </div>
              <button onClick={save} disabled={saving}
                className={`btn-primary ${saved ? '!bg-green-500 !shadow-none' : ''}`}>
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : saved ? <><Check size={14} /> Saved</>
                  : <><Save size={14} /> Save Changes</>}
              </button>
            </div>

            <div className="card space-y-5">
              {def.fields.map((field) => (
                <div key={field.key}>
                  {field.type === 'section' ? (
                    <div className="border-t border-brand-border pt-4 -mx-5 px-5">
                      <p className="font-body text-[11px] font-bold uppercase tracking-wider text-primary">{field.label}</p>
                    </div>
                  ) : field.type === 'group' && field.group ? (
                    <GroupField groupKey={field.key} group={field.group} values={fieldValues} setMany={setMany} />
                  ) : field.type === 'image' ? (
                    <ImageField
                      label={field.label.replace(/ URL$/, '')}
                      value={fieldValues[field.key] || ''}
                      onChange={(url) => set(field.key, url)}
                    />
                  ) : field.type === 'link' ? (
                    <>
                      <label className="input-label">{field.label}</label>
                      <input
                        list="cms-routes"
                        value={fieldValues[field.key] || ''}
                        onChange={(e) => set(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="input-field"
                      />
                      <datalist id="cms-routes">
                        {ROUTES.map((r) => <option key={r.path} value={r.path}>{r.label}</option>)}
                      </datalist>
                      <p className="mt-1 font-body text-[11px] text-brand-muted">Pick a page from the list or type a custom path.</p>
                    </>
                  ) : (
                  <>
                  <label className="input-label">{field.label}</label>
                  {field.type === 'textarea' || field.type === 'richtext' ? (
                    <div>
                      <textarea
                        value={fieldValues[field.key] || ''}
                        onChange={(e) => set(field.key, e.target.value)}
                        rows={field.rows || 4}
                        placeholder={field.placeholder}
                        className={`input-field resize-y ${field.type === 'richtext' ? 'font-mono text-xs' : ''}`}
                      />
                      {field.type === 'richtext' && (
                        <p className="mt-1 flex items-center gap-1 font-body text-[11px] text-brand-muted">
                          <AlertCircle size={10} />
                          HTML supported: &lt;h2&gt; &lt;h3&gt; &lt;p&gt; &lt;strong&gt; &lt;em&gt; &lt;ul&gt; &lt;li&gt;
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                      value={fieldValues[field.key] || ''}
                      onChange={(e) => set(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input-field"
                    />
                  )}
                  {field.help && <p className="mt-1 font-body text-[11px] text-blue-500">{field.help}</p>}
                  </>
                  )}
                </div>
              ))}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}

// Image field with drag-free upload: click to pick a file, uploads to GCS,
// stores the returned URL. Manual URL paste still supported via the text box.
// Repeatable section (hero slides, banners, featured, reviews). Items are stored
// as flat keys `${groupKey}_${i}_${suffix}`; a `${groupKey}_count` key tracks how
// many exist so admins can add/remove entries freely.
function GroupField({ groupKey, group, values, setMany }: {
  groupKey: string; group: GroupDef;
  values: Record<string, string>;
  setMany: (updater: (p: Record<string, string>) => Record<string, string>) => void;
}) {
  // Resolve the current item count: explicit count key, else scan by presence.
  const explicit = Number(values[`${groupKey}_count`]);
  let count = explicit > 0 ? explicit : 0;
  if (!explicit) {
    for (let i = 1; i <= group.max; i++) {
      if (values[`${groupKey}_${i}_${group.presence}`]) count = i;
    }
  }
  count = Math.max(count, group.min);

  const itemKey = (i: number, suffix: string) => `${groupKey}_${i}_${suffix}`;

  const add = () => setMany((p) => ({ ...p, [`${groupKey}_count`]: String(count + 1) }));

  const removeAt = (idx: number) => setMany((p) => {
    const next = { ...p };
    // Shift every item after idx up by one, then clear the last.
    for (let j = idx; j < count; j++) {
      group.fields.forEach((f) => { next[itemKey(j, f.suffix)] = p[itemKey(j + 1, f.suffix)] || ''; });
    }
    group.fields.forEach((f) => { delete next[itemKey(count, f.suffix)]; });
    next[`${groupKey}_count`] = String(Math.max(count - 1, group.min));
    return next;
  });

  const setField = (i: number, suffix: string, value: string) =>
    setMany((p) => ({ ...p, [itemKey(i, suffix)]: value }));

  const items = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i} className="rounded-xl p-3" style={{ border: '1px solid var(--c-border)', background: 'var(--c-bg)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-brand-text">{group.itemLabel} {i}</span>
            {count > group.min && (
              <button type="button" onClick={() => removeAt(i)} title="Remove"
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md"
                style={{ color: '#EF4444' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <Trash2 size={11} /> Remove
              </button>
            )}
          </div>
          <div className="space-y-3">
            {group.fields.map((f) => {
              const val = values[itemKey(i, f.suffix)] || '';
              if (f.type === 'image') {
                return <ImageField key={f.suffix} label={f.label} value={val} onChange={(url) => setField(i, f.suffix, url)} />;
              }
              return (
                <div key={f.suffix}>
                  <label className="input-label">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={val} onChange={(e) => setField(i, f.suffix, e.target.value)}
                      rows={f.rows || 2} placeholder={f.placeholder} className="input-field resize-y" />
                  ) : (
                    <input list={f.type === 'link' ? 'cms-routes' : undefined}
                      value={val} onChange={(e) => setField(i, f.suffix, e.target.value)}
                      placeholder={f.placeholder} className="input-field" />
                  )}
                  {f.help && <p className="mt-1 font-body text-[11px] text-brand-muted">{f.help}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {count < group.max && (
        <button type="button" onClick={add}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold border border-dashed transition-colors"
          style={{ borderColor: 'var(--c-primary)', color: 'var(--c-primary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--c-primary-soft)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <Plus size={14} /> Add {group.itemLabel}
        </button>
      )}
      {/* Shared route suggestions for link fields inside groups */}
      <datalist id="cms-routes">
        {ROUTES.map((r) => <option key={r.path} value={r.path}>{r.label}</option>)}
      </datalist>
    </div>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await cmsApi.uploadImage(fd);
      onChange(data.data.url);
      toast.success('Image uploaded');
    } catch { /* interceptor toasts */ } finally { setBusy(false); }
  };

  return (
    <>
      <label className="input-label">{label}</label>
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-brand-border bg-brand-bg flex items-center justify-center">
          {value ? (
            <>
              <img src={value} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => onChange('')}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                title="Remove image">
                <X size={11} />
              </button>
            </>
          ) : (
            <ImageIcon size={22} className="text-brand-border" />
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0 space-y-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="btn-outline text-[12px] disabled:opacity-60">
            {busy ? <span className="w-3.5 h-3.5 border-2 border-brand-border border-t-primary rounded-full animate-spin" />
              : <Upload size={13} />}
            {busy ? 'Uploading…' : value ? 'Replace Image' : 'Upload Image'}
          </button>
          <input type="url" value={value} onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
            className="input-field text-[11px]" />
        </div>
      </div>
    </>
  );
}
