import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy singleton — the Razorpay SDK throws "key_id is mandatory" if the
// keys are missing at construction time. Building it on first use keeps a
// missing/optional key from crashing the whole server at import/boot.
let razorpayClient: Razorpay | null = null;
const getRazorpay = (): Razorpay => {
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
  }
  return razorpayClient;
};

export const createRazorpayOrder = async (amount: number, currency = 'INR', receipt: string) => {
  return getRazorpay().orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt,
  });
};

export const verifyRazorpaySignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};

export const fetchRazorpayPayment = async (paymentId: string) =>
  getRazorpay().payments.fetch(paymentId);

/**
 * Hosted Payment Link — returns `short_url` the storefront/mobile open in a
 * browser. Works cross-platform without the checkout.js / native SDK.
 */
export const createRazorpayPaymentLink = async (
  amount: number,
  receipt: string,
  customer: { name: string; email?: string; contact?: string },
  callbackUrl: string,
  currency = 'INR'
) => {
  return getRazorpay().paymentLink.create({
    amount: Math.round(amount * 100),
    currency,
    accept_partial: false,
    reference_id: receipt,
    description: `Style In Need Order ${receipt}`,
    customer,
    notify: { sms: false, email: !!customer.email },
    callback_url: callbackUrl,
    callback_method: 'get',
  });
};

export const fetchRazorpayPaymentLink = async (id: string) =>
  getRazorpay().paymentLink.fetch(id);

export const refundRazorpayPayment = async (paymentId: string, amount: number) =>
  getRazorpay().payments.refund(paymentId, { amount: Math.round(amount * 100) });
