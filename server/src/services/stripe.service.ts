import Stripe from 'stripe';

// Lazy singleton so a missing key doesn't crash the server at import/boot.
let stripeClient: InstanceType<typeof Stripe> | null = null;
const getStripe = (): InstanceType<typeof Stripe> => {
  if (!stripeClient) {
    // apiVersion omitted — pin via the Stripe dashboard / account default.
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }
  return stripeClient;
};

/**
 * Hosted Checkout Session — returns a `url` the storefront/mobile open in a
 * browser. Amount is in major units (₹); Stripe wants the smallest unit.
 */
export const createStripeCheckoutSession = async (
  amount: number,
  receipt: string,
  successUrl: string,
  cancelUrl: string,
  currency = 'inr'
) => {
  return getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: `Style In Need Order ${receipt}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { receipt },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
};

export const retrieveStripeCheckoutSession = async (id: string) =>
  getStripe().checkout.sessions.retrieve(id);

export const refundStripePayment = async (paymentIntentId: string) =>
  getStripe().refunds.create({ payment_intent: paymentIntentId });
