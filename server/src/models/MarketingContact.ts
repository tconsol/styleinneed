import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * A contact brought in from a spreadsheet rather than earned through the store.
 *
 * Kept apart from User/Order so an import can never alter customer records —
 * it only adds reach. Both marketing consoles read it as an extra audience
 * source, and the existing de-duplication merges an imported contact with the
 * same person's registration or order automatically.
 */
export interface IMarketingContact extends Document {
  _id: Types.ObjectId;
  /** Lower-cased. Present on email imports. */
  email?: string;
  /** E.164 digits, no "+". Present on WhatsApp imports. */
  phone?: string;
  name?: string;
  /** The upload batch this arrived in, so one import can be undone. */
  listName: string;
  importedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const marketingContactSchema = new Schema<IMarketingContact>(
  {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    name: { type: String, trim: true },
    listName: { type: String, default: 'Imported', trim: true },
    importedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Partial unique indexes: a value is unique when present, and rows carrying
// only the other field don't collide on a shared `null`.
marketingContactSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);
marketingContactSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);
marketingContactSchema.index({ listName: 1 });

export default mongoose.model<IMarketingContact>('MarketingContact', marketingContactSchema);
