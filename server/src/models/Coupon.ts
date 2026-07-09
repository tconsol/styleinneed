import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICoupon extends Document {
  _id: Types.ObjectId;
  code: string;
  type: 'percentage' | 'flat' | 'free_shipping' | 'first_order' | 'festival';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit: number;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  applicableCategories: Types.ObjectId[];
  applicableProducts: Types.ObjectId[];
  restrictedUsers: Types.ObjectId[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['percentage', 'flat', 'free_shipping', 'first_order', 'festival'],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: Number,
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    restrictedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    description: String,
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, expiryDate: 1 });

export default mongoose.model<ICoupon>('Coupon', couponSchema);
