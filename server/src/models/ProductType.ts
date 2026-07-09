import mongoose, { Schema, Document, Types } from 'mongoose';
import slugify from 'slugify';

export interface IProductType extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productTypeSchema = new Schema<IProductType>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    icon: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productTypeSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model<IProductType>('ProductType', productTypeSchema);
