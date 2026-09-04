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

export const verifyEmailConnection = async (): Promise<void> => {
  try {
    await transporter.verify();
    logger.info('Email service connected');
  } catch (err) {
    logger.warn('Email service not connected:', err);
  }
};
