import mongoose, { Schema, Document, Types } from 'mongoose';
import { IOrderItem, IAddress } from '../types';

// A short-lived snapshot of a checkout awaiting online payment. The real Order
// row is created ONLY when payment verifies (see order.controller.confirmPaidSession).
// Abandoned/failed payments simply expire via the TTL index and never become orders.
export interface IPaymentSession extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IAddress;
  currency: 'INR' | 'USD';
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  coupon?: Types.ObjectId;
  paymentMethod: 'razorpay' | 'stripe';
  provider: 'razorpay' | 'stripe';
  razorpayLinkId?: string;
  stripeSessionId?: string;
  isGuest: boolean;
  guestToken?: string; // required to consume a guest session (ids are guessable)
  /** Store credit reserved for this checkout (order currency). */
  walletCreditUsed: number;
  /** Set once reserved credit has been handed back to an abandoned checkout. */
  creditReleased: boolean;
  status: 'pending' | 'consumed';
  order?: Types.ObjectId; // set once consumed
  expiresAt: Date;
  /** When the row itself is deleted — later than expiresAt so the credit-release sweep can still see it. */
  purgeAt: Date;
  createdAt: Date;
}

const sessionItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: {
      sku: { type: String, required: true },
      stock: Number,
      images: [String],
      attributes: { type: Map, of: String, default: {} },
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const addressSnapshot = new Schema(
  {
    label: String,
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const paymentSessionSchema = new Schema<IPaymentSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [sessionItemSchema], required: true },
    shippingAddress: { type: addressSnapshot, required: true },
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
    subtotal: { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    paymentMethod: { type: String, enum: ['razorpay', 'stripe'], required: true },
    provider: { type: String, enum: ['razorpay', 'stripe'], required: true },
    razorpayLinkId: String,
    stripeSessionId: String,
    isGuest: { type: Boolean, default: false },
    guestToken: { type: String, select: false },
    walletCreditUsed: { type: Number, default: 0, min: 0 },
    creditReleased: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'consumed'], default: 'pending' },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    // Payment validity window: ~1h after creation.
    expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000) },
    // The row lingers past that so reserved store credit can be released before
    // the document disappears.
    purgeAt: { type: Date, default: () => new Date(Date.now() + 7 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

// Mongo TTL monitor removes docs once purgeAt passes.
paymentSessionSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
// Drives the abandoned-checkout credit-release sweep.
paymentSessionSchema.index({ status: 1, creditReleased: 1, expiresAt: 1 });

export default mongoose.model<IPaymentSession>('PaymentSession', paymentSessionSchema);
