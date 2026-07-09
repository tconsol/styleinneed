import mongoose, { Schema, Document } from 'mongoose';

export interface IProvider extends Document {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  category: 'clothing' | 'jewellery' | 'accessories' | 'all' | 'other';
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const providerSchema = new Schema<IProvider>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    category: { type: String, enum: ['clothing', 'jewellery', 'accessories', 'all', 'other'], default: 'all' },
    address: String,
    city: String,
    state: String,
    gstin: { type: String, trim: true, uppercase: true },
    bankAccountName: String,
    bankAccountNumber: String,
    bankIfsc: { type: String, trim: true, uppercase: true },
    bankName: String,
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

providerSchema.index({ name: 'text' });
providerSchema.index({ category: 1, isActive: 1 });

export default mongoose.model<IProvider>('Provider', providerSchema);
