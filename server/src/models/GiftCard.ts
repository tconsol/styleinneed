import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';

export interface IGiftCard extends Document {
  _id: Types.ObjectId;
  code: string;
  /** Face value in INR. */
  amount: number;
  isRedeemed: boolean;
  redeemedBy?: Types.ObjectId;
  redeemedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  /** Who it was created for, free text (email or name) — purely informational. */
  issuedTo?: string;
  note?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const giftCardSchema = new Schema<IGiftCard>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    redeemedAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    issuedTo: String,
    note: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

giftCardSchema.index({ isRedeemed: 1, isActive: 1 });

/**
 * Generate a bearer code with enough entropy that it can't be brute-forced.
 * Excludes characters that are easy to misread aloud (0/O, 1/I).
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const generateGiftCardCode = (): string => {
  const bytes = crypto.randomBytes(16);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  // GIFT-XXXX-XXXX-XXXX-XXXX
  return `GIFT-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}`;
};

export default mongoose.model<IGiftCard>('GiftCard', giftCardSchema);
