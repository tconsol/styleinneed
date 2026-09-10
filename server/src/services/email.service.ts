import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  // If SMTP_SECURE isn't set, derive it from the port (465 = implicit TLS).
  // A 465 connection with secure:false handshakes wrong and times out (421).
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  // Fail fast instead of hanging the request if the SMTP host is unreachable.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

const from = process.env.EMAIL_FROM || 'Style In Need Fashions <no-reply@styleinneedfashions.com>';

export const sendOtpEmail = async (email: string, otp: string, name: string): Promise<void> => {
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Verify your email - Style In Need Fashions',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #FFF9F5;">
        <h2 style="font-family: 'Playfair Display', serif; color: #1C1C1C;">Hello, ${name}</h2>
        <p style="color: #555;">Your email verification OTP is:</p>
        <div style="font-size: 36px; font-weight: bold; color: #C8A97E; letter-spacing: 8px; margin: 24px 0;">${otp}</div>
        <p style="color: #888; font-size: 14px;">Valid for ${process.env.OTP_EXPIRES_IN || 10} minutes. Do not share.</p>
        <hr style="border: none; border-top: 1px solid #F5EFE8; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 12px;">Style In Need Fashions — Elegance Redefined</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, resetUrl: string, name: string): Promise<void> => {
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Reset your password - Style In Need Fashions',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #FFF9F5;">
        <h2 style="font-family: 'Playfair Display', serif; color: #1C1C1C;">Hello, ${name}</h2>
        <p style="color: #555;">Click below to reset your password. Link expires in 15 minutes.</p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 32px; background: #C8A97E; color: #fff; text-decoration: none; border-radius: 4px; font-weight: 600;">Reset Password</a>
        <p style="color: #888; font-size: 14px;">If you didn't request this, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #F5EFE8; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 12px;">Style In Need Fashions — Elegance Redefined</p>
      </div>
    `,
  });
};

export const sendOrderConfirmationEmail = async (
  email: string,
  name: string,
  orderId: string,
  total: number
): Promise<void> => {
  await transporter.sendMail({
    from,
    to: email,
    subject: `Order Confirmed #${orderId} - Style In Need Fashions`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #FFF9F5;">
        <h2 style="font-family: 'Playfair Display', serif; color: #1C1C1C;">Thank you, ${name}!</h2>
        <p style="color: #555;">Your order <strong>#${orderId}</strong> has been confirmed.</p>
        <p style="color: #555;">Total: <strong>₹${total.toLocaleString('en-IN')}</strong></p>
        <p style="color: #888; font-size: 14px;">You will receive shipping updates via email.</p>
        <hr style="border: none; border-top: 1px solid #F5EFE8; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 12px;">Style In Need Fashions — Elegance Redefined</p>
      </div>
    `,
  });
};

export interface PromotionEmailTheme {
  primary: string;
  primaryDark: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

const DEFAULT_PROMO_THEME: PromotionEmailTheme = {
  primary: '#C8A97E', primaryDark: '#A8864A',
  bg: '#FFF9F5', surface: '#FFFFFF', text: '#1C1C1C', muted: '#6B6B6B', border: '#E8DDD4',
};

export interface PromotionEmail {
  title: string;
  description?: string;
  discountLabel?: string; // e.g. "20% OFF" or "₹500 OFF"
  badgeText?: string;
  bannerImage?: string;
  code?: string;
  ctaUrl: string;
  ctaText?: string;
  unsubscribeUrl?: string;
  theme?: PromotionEmailTheme;
}

// Renders + sends one promotional email. Used by the newsletter broadcast.
// Colours follow the store's active theme (falls back to a neutral gold if
// none is resolved) so the mail matches whatever look is live on the site.
export const sendPromotionEmail = async (email: string, p: PromotionEmail): Promise<void> => {
  const t = { ...DEFAULT_PROMO_THEME, ...p.theme };
  await transporter.sendMail({
    from,
    to: email,
    subject: p.title,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: auto; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 12px; overflow: hidden;">
        ${p.bannerImage ? `<img src="${p.bannerImage}" alt="" style="width: 100%; display: block;" />` : ''}
        <div style="padding: 32px; text-align: center;">
          ${p.badgeText ? `<span style="display: inline-block; background: ${t.primary}; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; margin-bottom: 16px;">${p.badgeText}</span>` : ''}
          <h1 style="font-family: 'Playfair Display', serif; color: ${t.text}; font-size: 28px; margin: 8px 0;">${p.title}</h1>
          ${p.discountLabel ? `<div style="font-size: 40px; font-weight: 800; color: ${t.primary}; margin: 12px 0;">${p.discountLabel}</div>` : ''}
          ${p.description ? `<p style="color: ${t.muted}; font-size: 15px; line-height: 1.6;">${p.description}</p>` : ''}
          ${p.code ? `<div style="margin: 20px auto; display: inline-block; border: 2px dashed ${t.primary}; padding: 10px 24px; border-radius: 8px; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: ${t.text};">${p.code}</div>` : ''}
          <div>
            <a href="${p.ctaUrl}" style="display: inline-block; margin: 24px 0 8px; padding: 14px 40px; background: ${t.primaryDark}; color: #fff; text-decoration: none; border-radius: 999px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 14px;">${p.ctaText || 'Shop Now'}</a>
          </div>
        </div>
        <div style="padding: 16px 32px; background: ${t.surface}; border-top: 1px solid ${t.border}; text-align: center;">
          <p style="color: ${t.muted}; font-size: 11px; margin: 0;">Style In Need Fashions — Elegance Redefined</p>
          ${p.unsubscribeUrl ? `<p style="color: ${t.muted}; font-size: 11px; margin: 6px 0 0;"><a href="${p.unsubscribeUrl}" style="color: ${t.muted};">Unsubscribe</a></p>` : ''}
        </div>
      </div>
    `,
  });
};

export interface GiftCardEmail {
  code: string;
  pin?: string;
  amount: number;
  recipientName?: string;
  note?: string;
  expiresAt?: Date;
  ctaUrl: string;
  theme?: PromotionEmailTheme;
}

/**
 * The gift card itself, rendered as a card the recipient can read the code and
 * PIN straight off.
 *
 * Built with tables and inline styles because Outlook ignores flexbox and grid,
 * and the "card" is a background gradient on a <td> rather than an image so it
 * still renders when a client blocks remote content.
 */
export const sendGiftCardEmail = async (email: string, g: GiftCardEmail): Promise<void> => {
  const t = { ...DEFAULT_PROMO_THEME, ...g.theme };
  const expiry = g.expiresAt
    ? g.expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const field = (label: string, value: string, spaced: boolean) => `
    <td style="padding: 0 6px;">
      <div style="color: rgba(255,255,255,0.65); font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 5px;">${label}</div>
      <div style="color: #fff; font-family: 'Courier New', Courier, monospace; font-size: ${spaced ? '17' : '20'}px; font-weight: 700; letter-spacing: ${spaced ? '1.5' : '4'}px;">${value}</div>
    </td>`;

  await transporter.sendMail({
    from,
    to: email,
    subject: `Your ₹${g.amount} Style In Need gift card`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: auto; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 12px; overflow: hidden;">
        <div style="padding: 32px 32px 8px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', Georgia, serif; color: ${t.text}; font-size: 26px; margin: 0 0 6px;">
            ${g.recipientName ? `${g.recipientName}, a` : 'A'} gift for you
          </h1>
          <p style="color: ${t.muted}; font-size: 14px; line-height: 1.6; margin: 0;">
            ${g.note ? g.note : 'Use it on anything in the store — it goes straight into your wallet.'}
          </p>
        </div>

        <!-- The card -->
        <div style="padding: 24px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
            style="border-radius: 16px; background: ${t.primaryDark}; background-image: linear-gradient(135deg, ${t.primary} 0%, ${t.primaryDark} 100%);">
            <tr>
              <td style="padding: 24px 22px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="color: rgba(255,255,255,0.8); font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 700;">
                      Style In Need
                    </td>
                    <td align="right" style="color: #fff; font-size: 30px; font-weight: 800; line-height: 1;">
                      &#8377;${g.amount}
                    </td>
                  </tr>
                </table>

                <div style="height: 1px; background: rgba(255,255,255,0.25); margin: 18px 0;"></div>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>${field('Gift card number', g.code, true)}</tr>
                </table>

                ${g.pin ? `
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                  <tr>
                    ${field('PIN', g.pin, false)}
                    <td align="right" style="padding: 0 6px; color: rgba(255,255,255,0.65); font-size: 10px;">
                      ${expiry ? `Valid till<br /><span style="color:#fff; font-weight:700; font-size:12px;">${expiry}</span>` : ''}
                    </td>
                  </tr>
                </table>` : (expiry ? `
                <div style="margin-top: 14px; color: rgba(255,255,255,0.65); font-size: 10px;">
                  Valid till <span style="color:#fff; font-weight:700;">${expiry}</span>
                </div>` : '')}
              </td>
            </tr>
          </table>
        </div>

        <div style="padding: 0 32px 28px; text-align: center;">
          <a href="${g.ctaUrl}" style="display: inline-block; padding: 14px 40px; background: ${t.primaryDark}; color: #fff; text-decoration: none; border-radius: 999px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 13px;">
            Redeem it now
          </a>
          <p style="color: ${t.muted}; font-size: 12px; line-height: 1.7; margin: 18px 0 0;">
            Sign in, open <strong style="color: ${t.text};">Wallet</strong>, and enter the number${g.pin ? ' and PIN' : ''} above.
            It can only be redeemed once, so keep this email to yourself.
          </p>
        </div>

        <div style="padding: 16px 32px; background: ${t.surface}; border-top: 1px solid ${t.border}; text-align: center;">
          <p style="color: ${t.muted}; font-size: 11px; margin: 0;">Style In Need Fashions — Elegance Redefined</p>
        </div>
      </div>
    `,
  });
};

/** Internal ops alert — tells the admins a variant needs restocking. */
export const sendLowStockEmail = async (
  to: string[],
  info: { productName: string; slug: string; sku: string; stock: number; threshold: number }
): Promise<void> => {
  if (to.length === 0) return;
  const out = info.stock === 0;
  await transporter.sendMail({
    from,
    to: to.join(','),
    subject: `${out ? 'Out of stock' : 'Low stock'}: ${info.productName} (${info.sku})`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: auto; padding: 28px; background: #FFF9F5;">
        <span style="display:inline-block;background:${out ? '#DC2626' : '#F59E0B'};color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;border-radius:999px;">
          ${out ? 'Out of stock' : 'Low stock'}
        </span>
        <h2 style="color:#1C1C1C;margin:14px 0 4px;">${info.productName}</h2>
        <p style="color:#555;margin:0 0 16px;">Variant <strong>${info.sku}</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
          <tr><td style="padding:6px 0;color:#888;">Units remaining</td><td style="text-align:right;font-weight:700;">${info.stock}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Alert threshold</td><td style="text-align:right;">${info.threshold}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #F5EFE8;margin:20px 0;" />
        <p style="color:#bbb;font-size:12px;">Style In Need Fashions — inventory alert</p>
      </div>
    `,
  });
};

export interface AbandonedCartEmail {
  name: string;
  cartUrl: string;
  unsubscribeUrl?: string;
  items: { name: string; image?: string; quantity: number; price: number }[];
  currencySymbol: string;
  total: number;
}

/** Nudge a shopper who left items in their cart. */
export const sendAbandonedCartEmail = async (email: string, c: AbandonedCartEmail): Promise<void> => {
  const rows = c.items.map((i) => `
    <tr>
      <td style="padding:10px 0;width:64px;">
        ${i.image ? `<img src="${i.image}" width="56" height="72" style="display:block;object-fit:cover;border-radius:4px;" alt="" />` : ''}
      </td>
      <td style="padding:10px 12px;color:#1C1C1C;font-size:14px;">
        ${i.name}<br /><span style="color:#888;font-size:12px;">Qty ${i.quantity}</span>
      </td>
      <td style="padding:10px 0;text-align:right;color:#1C1C1C;font-size:14px;font-weight:600;white-space:nowrap;">
        ${c.currencySymbol}${(i.price * i.quantity).toLocaleString('en-IN')}
      </td>
    </tr>`).join('');

  await transporter.sendMail({
    from,
    to: email,
    subject: 'You left something behind',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: auto; padding: 32px; background: #FFF9F5;">
        <h2 style="font-family: 'Playfair Display', serif; color: #1C1C1C; margin: 0 0 6px;">Still thinking it over, ${c.name}?</h2>
        <p style="color: #555; margin: 0 0 20px;">Your picks are still in your bag — we&rsquo;ve saved them for you.</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <table style="width:100%;border-top:1px solid #E8DDD4;margin-top:12px;">
          <tr>
            <td style="padding-top:12px;color:#888;font-size:14px;">Total</td>
            <td style="padding-top:12px;text-align:right;color:#1C1C1C;font-size:16px;font-weight:700;">
              ${c.currencySymbol}${c.total.toLocaleString('en-IN')}
            </td>
          </tr>
        </table>
        <div style="text-align:center;">
          <a href="${c.cartUrl}" style="display:inline-block;margin:26px 0 8px;padding:14px 40px;background:#1C1C1C;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:14px;">Complete your order</a>
        </div>
        <hr style="border:none;border-top:1px solid #F5EFE8;margin:24px 0;" />
        <p style="color:#bbb;font-size:12px;text-align:center;margin:0;">Style In Need Fashions — Elegance Redefined</p>
        ${c.unsubscribeUrl ? `<p style="color:#bbb;font-size:11px;text-align:center;margin:6px 0 0;"><a href="${c.unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a></p>` : ''}
      </div>
    `,
  });
};

export const verifyEmailConnection = async (): Promise<void> => {
  try {
    await transporter.verify();
    logger.info('Email service connected');
  } catch (err) {
    logger.warn('Email service not connected:', err);
  }
};
