import mongoose, { Schema, Document } from 'mongoose';

// Per-state delivery charge for USA & Canada (amounts in USD). India shipping
// is threshold/flat and lives in Settings, not here. There is no free-shipping
// concept for US/CA — every state has a positive charge.
export interface IShippingRate extends Document {
  country: 'US' | 'CA';
  stateCode: string;
  stateName: string;
  charge: number; // USD
  isActive: boolean;
}

const shippingRateSchema = new Schema<IShippingRate>(
  {
    country: { type: String, enum: ['US', 'CA'], required: true },
    stateCode: { type: String, required: true, uppercase: true, trim: true },
    stateName: { type: String, required: true },
    charge: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shippingRateSchema.index({ country: 1, stateCode: 1 }, { unique: true });

export default mongoose.model<IShippingRate>('ShippingRate', shippingRateSchema);
