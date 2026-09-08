import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * A customer's store credit balance.
 *
 * `balance` is a denormalised running total kept in step with WalletTransaction
 * — every mutation goes through utils/wallet.ts, which writes both together and
 * uses a conditional $inc so a balance can never go negative under concurrency.
 * All amounts are INR (the store's base currency); USD carts convert at
 * checkout using the admin exchange rate.
 */
export interface IWallet extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IWallet>('Wallet', walletSchema);
