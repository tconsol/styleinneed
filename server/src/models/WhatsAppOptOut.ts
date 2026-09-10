import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Numbers that must never receive marketing again.
 *
 * Holding someone's number because they placed an order is not consent to keep
 * messaging them — WhatsApp suspends senders over exactly this. The audience
 * builder subtracts this list before any send, whichever source the number
 * appeared in.
 */
export interface IWhatsAppOptOut extends Document {
  _id: Types.ObjectId;
  /** E.164 digits, no "+". */
  phone: string;
  reason?: string;
  /** Who recorded it: the customer replying STOP, or an admin. */
  source: 'customer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppOptOutSchema = new Schema<IWhatsAppOptOut>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    reason: String,
    source: { type: String, enum: ['customer', 'admin'], default: 'admin' },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppOptOut>('WhatsAppOptOut', whatsAppOptOutSchema);
