import mongoose, { Schema, Document, Types } from 'mongoose';
import slugify from 'slugify';

export type AttributeLevel = 'product' | 'variant';
export type AttributeInputType = 'select' | 'multiselect' | 'chips' | 'color';

export interface IAttributeOption {
  label: string;
  value: string;
  hex?: string;
  sortOrder: number;
}

export interface IAttribute extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  level: AttributeLevel;
  inputType: AttributeInputType;
  options: IAttributeOption[];
  productTypes: string[]; // ProductType slugs; [] = applies to all
  isFilterable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<IAttributeOption>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    hex: String,
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const attributeSchema = new Schema<IAttribute>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    level: { type: String, enum: ['product', 'variant'], default: 'product' },
    inputType: { type: String, enum: ['select', 'multiselect', 'chips', 'color'], default: 'chips' },
    options: [optionSchema],
    productTypes: { type: [String], default: [] },
    isFilterable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

attributeSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

attributeSchema.index({ isActive: 1, isFilterable: 1 });

export default mongoose.model<IAttribute>('Attribute', attributeSchema);
