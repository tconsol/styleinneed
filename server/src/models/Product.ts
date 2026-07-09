import mongoose, { Schema } from 'mongoose';
import slugify from 'slugify';
import { IProduct } from '../types';

const variantSchema = new Schema(
  {
    sku: { type: String, required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [String],
    // Variant-level attribute values (slug -> single value), e.g. { size: 'M', color: 'Red' }
    attributes: { type: Map, of: String, default: {} },
  },
  { _id: true }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    productType: { type: String, default: 'clothing', index: true }, // ProductType slug (admin-defined)
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategory: String,
    collections: [{ type: Schema.Types.ObjectId, ref: 'Collection' }],
    // Product-level attribute values (slug -> values array), admin-defined
    attributes: { type: Map, of: [String], default: {} },
    weightGrams: Number, // dedicated numeric field (range-filterable)
    mrp: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    usdMrp: { type: Number, min: 0 },
    usdSalePrice: { type: Number, min: 0 },
    discountPercentage: { type: Number, default: 0 },
    provider: { type: Schema.Types.ObjectId, ref: 'Provider' },
    sizeChartId: { type: Schema.Types.ObjectId, ref: 'SizeChart' },
    variants: [variantSchema],
    images: { type: [String], required: true },
    videos: [String],
    tags: [String],
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metaTitle: String,
    metaDescription: String,
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  if (this.isModified('mrp') || this.isModified('salePrice')) {
    this.discountPercentage =
      this.mrp > 0 ? Math.round(((this.mrp - this.salePrice) / this.mrp) * 100) : 0;
  }
  next();
});

productSchema.index({ category: 1 });
productSchema.index({ productType: 1, isActive: 1 });
productSchema.index({ collections: 1 });
// Wildcard index for dynamic attribute filtering (attributes.<slug>)
productSchema.index({ 'attributes.$**': 1 });
// Hard uniqueness guarantee for variant SKUs across the whole catalog
productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ isActive: 1, isNewArrival: 1 });
productSchema.index({ isActive: 1, isBestSeller: 1 });
productSchema.index({ isActive: 1, isTrending: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IProduct>('Product', productSchema);
