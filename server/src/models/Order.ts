import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../types';
import { v4 as uuidv4 } from 'uuid';

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: {
      sku: { type: String, required: true },
      stock: Number,
      images: [String],
      // Variant attribute snapshot (slug -> value) at time of order
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

const statusEventSchema = new Schema(
  {
    status: { type: String, required: true },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSnapshot, required: true },
    subtotal: { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'stripe', 'upi', 'card', 'netbanking', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    stripePaymentIntentId: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'],
      default: 'pending',
    },
    statusHistory: { type: [statusEventSchema], default: [] },
    shiprocketOrderId: String,
    awbCode: String,
    trackingUrl: String,
    cancelReason: String,
    notes: String,
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (!this.orderId) {
    this.orderId = `AVY-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
  }
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{ status: this.status || 'pending', note: 'Order placed', at: new Date() }];
  }
  next();
});

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model<IOrder>('Order', orderSchema);
