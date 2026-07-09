import mongoose, { Schema, Document, Types } from 'mongoose';
import slugify from 'slugify';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  productType?: string; // ProductType slug this category belongs to
  description?: string;
  image?: string;
  parent?: Types.ObjectId;
  isActive: boolean;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    productType: { type: String, index: true }, // ProductType slug
    description: String,
    image: String,
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    isActive: { type: Boolean, default: true },
    metaTitle: String,
    metaDescription: String,
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

categorySchema.index({ parent: 1 });

export default mongoose.model<ICategory>('Category', categorySchema);
