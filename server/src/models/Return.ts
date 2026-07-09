import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReturn extends Document {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  user: Types.ObjectId;
  items: { product: Types.ObjectId; variantSku: string; quantity: number }[];
  reason: 'wrong_size' | 'damaged_product' | 'wrong_product' | 'other';
  description?: string;
  images?: string[];
  status: 'requested' | 'approved' | 'processing' | 'completed' | 'rejected';
  refundAmount?: number;
  refundMethod?: string;
  adminNote?: string;
  processedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnSchema = new Schema<IReturn>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        variantSku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    reason: {
      type: String,
      enum: ['wrong_size', 'damaged_product', 'wrong_product', 'other'],
      required: true,
    },
    description: String,
    images: [String],
    status: {
      type: String,
      enum: ['requested', 'approved', 'processing', 'completed', 'rejected'],
      default: 'requested',
    },
    refundAmount: Number,
    refundMethod: String,
    adminNote: String,
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

returnSchema.index({ user: 1 });
returnSchema.index({ order: 1 });
returnSchema.index({ status: 1 });

export default mongoose.model<IReturn>('Return', returnSchema);
