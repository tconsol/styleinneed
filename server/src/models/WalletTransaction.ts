import mongoose, { Schema, Document, Types } from 'mongoose';

/** Every source of credit funnels into the same ledger. */
export type WalletTxnType =
  | 'loyalty'    // cashback earned on a paid order
  | 'referral'   // referrer/referee reward
  | 'gift_card'  // a redeemed gift card
  | 'refund'     // money returned as credit
  | 'spend'      // applied to an order
  | 'reversal'   // credit returned after a cancelled order
  | 'adjustment'; // manual admin correction

export interface IWalletTransaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** Signed: positive credits the customer, negative spends. */
  amount: number;
  /** Wallet balance immediately after this entry — makes the ledger auditable. */
  balanceAfter: number;
  type: WalletTxnType;
  description: string;
  order?: Types.ObjectId;
  giftCard?: Types.ObjectId;
  /** Admin who made a manual adjustment. */
  actor?: Types.ObjectId;
  createdAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    type: {
      type: String,
      enum: ['loyalty', 'referral', 'gift_card', 'refund', 'spend', 'reversal', 'adjustment'],
      required: true,
    },
    description: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    giftCard: { type: Schema.Types.ObjectId, ref: 'GiftCard' },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
// Guards the "credit cashback once per order" rule.
walletTransactionSchema.index({ order: 1, type: 1 });

export default mongoose.model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);
