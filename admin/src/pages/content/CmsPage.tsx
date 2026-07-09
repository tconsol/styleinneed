import { useState } from 'react';
import { Save, Globe, Check, AlertCircle, Building2, Phone, Lock, CornerDownLeft, Truck, Briefcase, Image, Home, LayoutTemplate } from 'lucide-react';
import { cmsApi } from '../../api';
import toast from 'react-hot-toast';

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'richtext' | 'url' | 'email' | 'phone' | 'section';
  placeholder?: string;
  help?: string;
  rows?: number;
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
      { key: 'hero_1_label', label: 'Slide 1 - Label', type: 'text', placeholder: 'New Collection 2025', help: 'Small tag shown above the title' },
      { key: 'hero_1_title', label: 'Slide 1 - Title', type: 'text', placeholder: 'Elegance Redefined', help: 'Use \\n for a line break (second line becomes italic)' },
      { key: 'hero_1_subtitle', label: 'Slide 1 - Subtitle', type: 'textarea', placeholder: 'Discover premium ethnic and western wear...', rows: 2 },
      { key: 'hero_1_cta', label: 'Slide 1 - Button 1 Text', type: 'text', placeholder: 'Shop Now' },
      { key: 'hero_1_cta_href', label: 'Slide 1 - Button 1 Link', type: 'text', placeholder: '/products' },
      { key: 'hero_1_cta2', label: 'Slide 1 - Button 2 Text', type: 'text', placeholder: 'View Collections' },
      { key: 'hero_1_cta2_href', label: 'Slide 1 - Button 2 Link', type: 'text', placeholder: '/collections' },
      { key: 'hero_1_image', label: 'Slide 1 - Background Image URL', type: 'url', placeholder: 'https://...' },
      { key: 'hero_2_label', label: 'Slide 2 - Label', type: 'text', placeholder: 'Wedding Collection' },
      { key: 'hero_2_title', label: 'Slide 2 - Title', type: 'text', placeholder: 'Bridal Splendour' },
      { key: 'hero_2_subtitle', label: 'Slide 2 - Subtitle', type: 'textarea', placeholder: 'Handcrafted silks for your special day...', rows: 2 },
      { key: 'hero_2_cta', label: 'Slide 2 - Button 1 Text', type: 'text', placeholder: 'Explore Bridal' },
      { key: 'hero_2_cta_href', label: 'Slide 2 - Button 1 Link', type: 'text', placeholder: '/products?category=sarees' },
      { key: 'hero_2_cta2', label: 'Slide 2 - Button 2 Text', type: 'text', placeholder: '' },
      { key: 'hero_2_cta2_href', label: 'Slide 2 - Button 2 Link', type: 'text', placeholder: '/' },
      { key: 'hero_2_image', label: 'Slide 2 - Background Image URL', type: 'url', placeholder: 'https://...' },
      { key: 'hero_3_label', label: 'Slide 3 - Label', type: 'text', placeholder: 'Festive Season' },
      { key: 'hero_3_title', label: 'Slide 3 - Title', type: 'text', placeholder: 'Celebrate in Style' },
      { key: 'hero_3_subtitle', label: 'Slide 3 - Subtitle', type: 'textarea', placeholder: 'Kurtis, lehengas and more...', rows: 2 },
      { key: 'hero_3_cta', label: 'Slide 3 - Button 1 Text', type: 'text', placeholder: 'Shop Festive' },
      { key: 'hero_3_cta_href', label: 'Slide 3 - Button 1 Link', type: 'text', placeholder: '/products?isFeatured=true' },
      { key: 'hero_3_cta2', label: 'Slide 3 - Button 2 Text', type: 'text', placeholder: '' },
      { key: 'hero_3_cta2_href', label: 'Slide 3 - Button 2 Link', type: 'text', placeholder: '/' },
      { key: 'hero_3_image', label: 'Slide 3 - Background Image URL', type: 'url', placeholder: 'https://...' },
      // ── MARQUEE ──
      { key: 's_marquee', label: 'Scrolling Marquee', type: 'section' },
      { key: 'marquee', label: 'Marquee Items', type: 'text', placeholder: 'Silk Sarees, Designer Kurtis, Bridal Lehengas', help: 'Comma-separated list of words/phrases that scroll across the page' },
      // ── COLLECTION BANNERS ──
      { key: 's_banners', label: 'Collection Banners', type: 'section' },
      { key: 'banner_1_label', label: 'Banner 1 - Label', type: 'text', placeholder: 'Exclusive' },
      { key: 'banner_1_title', label: 'Banner 1 - Title', type: 'text', placeholder: 'Wedding Season Collection' },
      { key: 'banner_1_subtitle', label: 'Banner 1 - Subtitle', type: 'textarea', placeholder: 'Handcrafted silks and brocades...', rows: 2 },
      { key: 'banner_1_image', label: 'Banner 1 - Image URL', type: 'url', placeholder: 'https://...' },
      { key: 'banner_1_href', label: 'Banner 1 - Link', type: 'text', placeholder: '/products?category=sarees' },
      { key: 'banner_1_cta', label: 'Banner 1 - Button Text', type: 'text', placeholder: 'Explore Collection' },
      { key: 'banner_1_dark', label: 'Banner 1 - Dark overlay? (true/false)', type: 'text', placeholder: 'true' },
      { key: 'banner_1_reverse', label: 'Banner 1 - Image on right? (true/false)', type: 'text', placeholder: 'false' },
      { key: 'banner_2_label', label: 'Banner 2 - Label', type: 'text', placeholder: 'New Season' },
      { key: 'banner_2_title', label: 'Banner 2 - Title', type: 'text', placeholder: 'Modern Indian Fashion' },
      { key: 'banner_2_subtitle', label: 'Banner 2 - Subtitle', type: 'textarea', placeholder: 'Contemporary styles with Indian craftsmanship...', rows: 2 },
      { key: 'banner_2_image', label: 'Banner 2 - Image URL', type: 'url', placeholder: 'https://...' },
      { key: 'banner_2_href', label: 'Banner 2 - Link', type: 'text', placeholder: '/products?category=kurtis' },
      { key: 'banner_2_cta', label: 'Banner 2 - Button Text', type: 'text', placeholder: 'Shop Now' },
      { key: 'banner_2_dark', label: 'Banner 2 - Dark overlay? (true/false)', type: 'text', placeholder: 'false' },
      { key: 'banner_2_reverse', label: 'Banner 2 - Image on right? (true/false)', type: 'text', placeholder: 'true' },
      // ── FEATURED CATEGORIES ──
      { key: 's_catfeatured', label: 'Featured Category Banners', type: 'section' },
      { key: 'cat_featured_1_title', label: 'Featured 1 - Title', type: 'text', placeholder: 'Silk Sarees' },
      { key: 'cat_featured_1_subtitle', label: 'Featured 1 - Subtitle', type: 'text', placeholder: 'Timeless elegance' },
      { key: 'cat_featured_1_image', label: 'Featured 1 - Image URL', type: 'url', placeholder: 'https://...' },
      { key: 'cat_featured_1_href', label: 'Featured 1 - Link', type: 'text', placeholder: '/products?category=sarees' },
      { key: 'cat_featured_2_title', label: 'Featured 2 - Title', type: 'text', placeholder: 'Bridal Lehengas' },
      { key: 'cat_featured_2_subtitle', label: 'Featured 2 - Subtitle', type: 'text', placeholder: 'Your dream bridal look' },
      { key: 'cat_featured_2_image', label: 'Featured 2 - Image URL', type: 'url', placeholder: 'https://...' },
      { key: 'cat_featured_2_href', label: 'Featured 2 - Link', type: 'text', placeholder: '/products?category=lehengas' },
      { key: 'cat_featured_3_title', label: 'Featured 3 - Title', type: 'text', placeholder: 'Designer Kurtis' },
      { key: 'cat_featured_3_subtitle', label: 'Featured 3 - Subtitle', type: 'text', placeholder: 'Everyday elegance' },
      { key: 'cat_featured_3_image', label: 'Featured 3 - Image URL', type: 'url', placeholder: 'https://...' },
      { key: 'cat_featured_3_href', label: 'Featured 3 - Link', type: 'text', placeholder: '/products?category=kurtis' },
      // ── FASHION STORY ──
      { key: 's_story', label: 'Our Story Section', type: 'section' },
      { key: 'story_label', label: 'Section Label', type: 'text', placeholder: 'Our Heritage' },
      { key: 'story_heading', label: 'Heading', type: 'text', placeholder: 'Crafting Elegance\nSince 2019', help: 'Use \\n for line break' },
      { key: 'story_para1', label: 'Paragraph 1', type: 'textarea', placeholder: 'Founded with a passion...', rows: 3 },
      { key: 'story_para2', label: 'Paragraph 2', type: 'textarea', placeholder: 'Every piece in our collection...', rows: 3 },
      { key: 'story_image', label: 'Image URL', type: 'url', placeholder: 'https://...' },
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
      { key: 'review_1_name', label: 'Review 1 - Name', type: 'text', placeholder: 'Priya Sharma' },
      { key: 'review_1_city', label: 'Review 1 - City', type: 'text', placeholder: 'Mumbai' },
      { key: 'review_1_product', label: 'Review 1 - Product', type: 'text', placeholder: 'Kanjeevaram Silk Saree' },
      { key: 'review_1_text', label: 'Review 1 - Text', type: 'textarea', placeholder: 'The silk saree I ordered was absolutely stunning...', rows: 2 },
      { key: 'review_2_name', label: 'Review 2 - Name', type: 'text', placeholder: 'Anitha Reddy' },
      { key: 'review_2_city', label: 'Review 2 - City', type: 'text', placeholder: 'Hyderabad' },
      { key: 'review_2_product', label: 'Review 2 - Product', type: 'text', placeholder: 'Bridal Lehenga' },
      { key: 'review_2_text', label: 'Review 2 - Text', type: 'textarea', placeholder: 'Style In Need Fashions is my go-to...', rows: 2 },
      { key: 'review_3_name', label: 'Review 3 - Name', type: 'text', placeholder: 'Meena Krishnan' },
      { key: 'review_3_city', label: 'Review 3 - City', type: 'text', placeholder: 'Chennai' },
      { key: 'review_3_product', label: 'Review 3 - Product', type: 'text', placeholder: 'Cotton Kurti Set' },
      { key: 'review_3_text', label: 'Review 3 - Text', type: 'textarea', placeholder: "I've bought from many online stores but Style In Need stands apart...", rows: 2 },
      { key: 'review_4_name', label: 'Review 4 - Name', type: 'text', placeholder: 'Deepa Nair' },
      { key: 'review_4_city', label: 'Review 4 - City', type: 'text', placeholder: 'Kochi' },
      { key: 'review_4_product', label: 'Review 4 - Product', type: 'text', placeholder: 'Banarasi Silk Saree' },
      { key: 'review_4_text', label: 'Review 4 - Text', type: 'textarea', placeholder: 'The designer saree collection here is unmatched...', rows: 2 },
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

export default function CmsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const def = PAGES.find((p) => p.key === selected);

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

  return (
    <div className="flex gap-5" style={{ minHeight: '70vh' }}>
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

            <div className="flex justify-end pb-4">
              <button onClick={save} disabled={saving} className={`btn-primary ${saved ? '!bg-green-500' : ''}`}>
                {saving ? 'Saving...' : saved ? 'All Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
