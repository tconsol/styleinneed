import 'dotenv/config';
import mongoose from 'mongoose';
import WhatsAppTemplate from '../models/WhatsAppTemplate';

/**
 * Ready-made campaign presets.
 *
 * `templateName` is a placeholder in every one — it must be repointed at a
 * template Meta has actually approved before the preset will send. The presets
 * exist so the copy, params and buttons are already shaped; they are not
 * sendable as shipped, by design.
 *
 * Idempotent: re-running updates the shipped presets in place and leaves
 * anything the store authored alone.
 */

const PRESETS = [
  {
    name: 'Festive Sale Announcement',
    category: 'Promotions',
    description: 'Big seasonal push with a hero image and a shop button.',
    templateName: 'festive_sale',
    headerType: 'image' as const,
    mediaUrl: '',
    bodyPreview:
      'Hi {{1}}! 🪔 Our Festive Collection is live — up to {{2}}% off on sarees, lehengas and jewellery.\n\nHurry, offer ends {{3}}.',
    footerPreview: 'Style In Need Fashions',
    params: ['', '40', 'this Sunday'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Shop Now', urlSuffix: 'products' }],
    tags: ['sale', 'festive'],
  },
  {
    name: 'New Arrivals Drop',
    category: 'Promotions',
    description: 'Video header showing the new collection.',
    templateName: 'new_arrivals',
    headerType: 'video' as const,
    mediaUrl: '',
    bodyPreview:
      'Hi {{1}}, fresh styles just landed 👗\n\n{{2}} new pieces added this week. Be the first to pick yours.',
    footerPreview: 'Style In Need Fashions',
    params: ['', '25'],
    buttons: [{ index: 0, type: 'url' as const, text: 'View Collection', urlSuffix: 'products?sort=newest' }],
    tags: ['new', 'collection'],
  },
  {
    name: 'Abandoned Cart Nudge',
    category: 'Recovery',
    description: 'Reminds a shopper what they left behind.',
    templateName: 'abandoned_cart',
    headerType: 'image' as const,
    mediaUrl: '',
    bodyPreview:
      'Hi {{1}}, you left something lovely behind 🛍️\n\n{{2}} is still in your cart. Complete your order before it sells out.',
    footerPreview: 'Style In Need Fashions',
    params: ['', 'Your item'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Complete Order', urlSuffix: 'cart' }],
    tags: ['cart', 'recovery'],
  },
  {
    name: 'Discount Coupon Blast',
    category: 'Promotions',
    description: 'Sends a coupon code with an image header.',
    templateName: 'coupon_blast',
    headerType: 'image' as const,
    mediaUrl: '',
    bodyPreview:
      'Hi {{1}}! Here is {{2}} off your next order 🎁\n\nUse code *{{3}}* at checkout. Valid till {{4}}.',
    footerPreview: 'One use per customer',
    params: ['', '₹500', 'STYLE500', '31 Dec'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Redeem Now', urlSuffix: 'products' }],
    tags: ['coupon', 'discount'],
  },
  {
    name: 'Back In Stock Alert',
    category: 'Catalogue',
    description: 'Tells a shopper a sold-out piece has returned.',
    templateName: 'back_in_stock',
    headerType: 'image' as const,
    mediaUrl: '',
    bodyPreview: 'Good news {{1}} — *{{2}}* is back in stock! ✨\n\nLimited pieces available.',
    footerPreview: 'Style In Need Fashions',
    params: ['', 'Your saved item'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Buy Now', urlSuffix: 'products' }],
    tags: ['stock', 'alert'],
  },
  {
    name: 'Order Shipped Update',
    category: 'Transactional',
    description: 'Dispatch note with a tracking button.',
    templateName: 'order_shipped',
    headerType: 'none' as const,
    bodyPreview:
      'Hi {{1}}, your order *{{2}}* has shipped 📦\n\nTracking: {{3}}\nExpected delivery: {{4}}.',
    footerPreview: 'Style In Need Fashions',
    params: ['', 'ORDER-ID', 'TRACKING-NO', '3-5 days'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Track Order', urlSuffix: 'orders' }],
    tags: ['order', 'shipping'],
  },
  {
    name: 'Gift Card Delivery',
    category: 'Transactional',
    description: 'Sends a gift card code and PIN.',
    templateName: 'gift_card',
    headerType: 'image' as const,
    mediaUrl: '',
    bodyPreview:
      'Hi {{1}}, you have received a ₹{{2}} gift card 🎁\n\nCard: *{{3}}*\nPIN: *{{4}}*\n\nRedeem it in your wallet.',
    footerPreview: 'Redeemable once',
    params: ['', '1000', 'GIFT-XXXX', '000000'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Redeem', urlSuffix: 'wallet' }],
    tags: ['gift', 'wallet'],
  },
  {
    name: 'Lookbook PDF',
    category: 'Catalogue',
    description: 'Sends the season catalogue as a downloadable PDF.',
    templateName: 'lookbook_pdf',
    headerType: 'document' as const,
    mediaUrl: '',
    mediaFilename: 'lookbook.pdf',
    bodyPreview: 'Hi {{1}}, here is our {{2}} lookbook 📖\n\nTap to download and browse the full collection.',
    footerPreview: 'Style In Need Fashions',
    params: ['', 'Spring'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Shop the Look', urlSuffix: 'products' }],
    tags: ['catalogue', 'pdf'],
  },
  {
    name: 'Flash Sale Countdown',
    category: 'Promotions',
    description: 'Short-window urgency push, GIF header.',
    templateName: 'flash_sale',
    headerType: 'video' as const,
    mediaUrl: '',
    bodyPreview: '⚡ {{1}}, FLASH SALE — {{2}} off everything!\n\nOnly {{3}} hours left. Don\'t miss it.',
    footerPreview: 'Ends at midnight',
    params: ['', '50%', '6'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Grab the Deal', urlSuffix: 'sale' }],
    tags: ['flash', 'urgency'],
  },
  {
    name: 'Win-Back Lapsed Customer',
    category: 'Recovery',
    description: 'Re-engages someone who has not ordered in a while.',
    templateName: 'win_back',
    headerType: 'image' as const,
    mediaUrl: '',
    bodyPreview:
      'We miss you {{1}} 💕\n\nIt has been a while. Here is {{2}} off to welcome you back — code *{{3}}*.',
    footerPreview: 'Style In Need Fashions',
    params: ['', '20%', 'WELCOME20'],
    buttons: [{ index: 0, type: 'url' as const, text: 'Shop Now', urlSuffix: 'products' }],
    tags: ['winback', 'retention'],
  },
];

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  let created = 0;
  let updated = 0;

  for (const preset of PRESETS) {
    const existing = await WhatsAppTemplate.findOne({ name: preset.name, isPreset: true });
    if (existing) {
      // Refresh the shipped copy but keep the store's own template name and
      // media URL — those are filled in locally and must survive a re-seed.
      existing.description = preset.description;
      existing.category = preset.category;
      existing.headerType = preset.headerType;
      existing.bodyPreview = preset.bodyPreview;
      existing.footerPreview = preset.footerPreview;
      existing.tags = preset.tags;
      await existing.save();
      updated += 1;
    } else {
      await WhatsAppTemplate.create({ ...preset, isPreset: true });
      created += 1;
    }
  }

  console.log(`WhatsApp presets — created: ${created}, updated: ${updated}, total: ${PRESETS.length}`);
  console.log('Point each one at a template Meta has approved before sending.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
