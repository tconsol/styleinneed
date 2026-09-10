import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';

export interface IGiftCard extends Document {
  _id: Types.ObjectId;
  code: string;
  /**
   * Second factor for the bearer code, stored AES-256-GCM encrypted rather
   * than hashed so the card can be re-sent to the recipient if they lose the
   * email. Never selected by default. Cards issued before PINs existed have
   * none and still redeem on the code alone.
   */
  pin?: string;
  /** Wrong-PIN attempts; the card locks itself once these run out. */
  pinAttempts: number;
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
  /** When the gift-card email was last delivered to `issuedTo`. */
  emailSentAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Wrong PINs allowed before the card is locked. */
export const MAX_PIN_ATTEMPTS = 5;

const giftCardSchema = new Schema<IGiftCard>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    pin: { type: String, select: false },
    pinAttempts: { type: Number, default: 0, select: false },
    amount: { type: Number, required: true, min: 1 },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    redeemedAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    issuedTo: String,
    note: String,
    emailSentAt: Date,
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

/**
 * 6-digit PIN. Drawn with rejection sampling from a 256-wide byte space so the
 * digits stay uniform — `byte % 10` would quietly favour 0-5.
 */
export const generateGiftCardPin = (): string => {
  let out = '';
  while (out.length < 6) {
    for (const b of crypto.randomBytes(8)) {
      if (b < 250 && out.length < 6) out += String(b % 10);
    }
  }
  return out;
};

export default mongoose.model<IGiftCard>('GiftCard', giftCardSchema);
