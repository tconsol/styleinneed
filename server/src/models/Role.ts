import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * An admin-defined staff role: a named bundle of feature keys.
 *
 * Staff accounts point at a role rather than carrying their own grant list, so
 * changing a role updates everyone holding it at once. Keys are validated
 * against config/providerFeatures.ts before they're stored.
 */
export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  /** Built-in roles can't be deleted, only edited. */
  isSystem: boolean;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: String,
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IRole>('Role', roleSchema);
