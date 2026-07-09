import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587/STARTTLS
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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

export const verifyEmailConnection = async (): Promise<void> => {
  try {
    await transporter.verify();
    logger.info('Email service connected');
  } catch (err) {
    logger.warn('Email service not connected:', err);
  }
};
