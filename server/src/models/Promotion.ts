import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPromotion extends Document {
  _id: Types.ObjectId;
  name: string;
  type: 'flash_sale' | 'category_discount' | 'product_discount' | 'buy_x_get_y' | 'festival';
  discountType: 'percentage' | 'flat';
  discountValue: number;
  applicableCategories: Types.ObjectId[];
  applicableProducts: Types.ObjectId[];
  buyQuantity?: number;
  getQuantity?: number;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const promotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['flash_sale', 'category_discount', 'product_discount', 'buy_x_get_y', 'festival'],
      required: true,
    },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    buyQuantity: Number,
    getQuantity: Number,
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    description: String,
  },
  { timestamps: true }
);

promotionSchema.index({ isActive: 1, startDate: 1, expiryDate: 1 });

export default mongoose.model<IPromotion>('Promotion', promotionSchema);
