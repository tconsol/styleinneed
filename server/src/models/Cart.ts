import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICartItem {
  product: Types.ObjectId;
  variantSku: string;
  quantity: number;
  price: number;
}

export interface ICart extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: ICartItem[];
  coupon?: Types.ObjectId;
  // Abandoned-cart recovery bookkeeping.
  remindedAt?: Date;
  reminderCount: number;
  updatedAt: Date;
}

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    remindedAt: Date,
    reminderCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Drives the abandoned-cart sweep.
cartSchema.index({ updatedAt: 1, reminderCount: 1 });


export default mongoose.model<ICart>('Cart', cartSchema);
