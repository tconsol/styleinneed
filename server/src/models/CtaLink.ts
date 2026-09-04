import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICtaLink extends Document {
  _id: Types.ObjectId;
  label: string;
  url: string;
  group: string;
  // Where the link came from: built-in site route, a product type (auto-managed),
  // or an admin-authored custom link.
  source: 'system' | 'productType' | 'custom';
  refId?: Types.ObjectId; // ProductType id when source === 'productType'
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ctaLinkSchema = new Schema<ICtaLink>(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    group: { type: String, default: 'General' },
    source: { type: String, enum: ['system', 'productType', 'custom'], default: 'custom' },
    refId: { type: Schema.Types.ObjectId, ref: 'ProductType' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

// One CTA link per product type; system links deduped by their url.
ctaLinkSchema.index({ source: 1, refId: 1 });
ctaLinkSchema.index({ source: 1, url: 1 });

export default mongoose.model<ICtaLink>('CtaLink', ctaLinkSchema);
