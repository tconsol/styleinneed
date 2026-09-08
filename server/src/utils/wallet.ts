import { Types } from 'mongoose';
import Wallet from '../models/Wallet';
import WalletTransaction, { WalletTxnType } from '../models/WalletTransaction';

type UserRef = Types.ObjectId | string;

/** Money is stored in whole paise-free rupees; never let float dust accumulate. */
const round = (n: number): number => Math.round(n * 100) / 100;

/** Read a balance, creating the wallet lazily on first access. */
export const getBalance = async (user: UserRef): Promise<number> => {
  const wallet = await Wallet.findOne({ user }).lean();
  return wallet?.balance ?? 0;
};

/**
 * Add credit and record it in the ledger.
 *
 * `idempotencyKey` (an order id + type) prevents double-crediting when a
 * fulfilment path runs twice — cashback for an order is only ever granted once.
 */
export const credit = async (
  user: UserRef,
  amount: number,
  type: WalletTxnType,
  description: string,
  extra: { order?: UserRef; giftCard?: UserRef; actor?: UserRef; once?: boolean } = {}
): Promise<{ ok: boolean; balance: number }> => {
  const value = round(amount);
  if (value <= 0) return { ok: false, balance: await getBalance(user) };

  // Guard against granting the same order-linked credit twice.
  if (extra.once && extra.order) {
    const existing = await WalletTransaction.exists({ order: extra.order, type });
    if (existing) return { ok: false, balance: await getBalance(user) };
  }

  const wallet = await Wallet.findOneAndUpdate(
    { user },
    { $inc: { balance: value } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await WalletTransaction.create({
    user,
    amount: value,
    balanceAfter: wallet.balance,
    type,
    description,
    order: extra.order,
    giftCard: extra.giftCard,
    actor: extra.actor,
  });

  return { ok: true, balance: wallet.balance };
};

/**
 * Spend credit. The `balance: { $gte: value }` filter makes the debit atomic —
 * two concurrent checkouts can't both pass a read-then-write balance check and
 * overdraw the wallet. Returns ok:false when there aren't enough funds.
 */
export const debit = async (
  user: UserRef,
  amount: number,
  type: WalletTxnType,
  description: string,
  extra: { order?: UserRef; actor?: UserRef } = {}
): Promise<{ ok: boolean; balance: number }> => {
  const value = round(amount);
  if (value <= 0) return { ok: true, balance: await getBalance(user) };

  const wallet = await Wallet.findOneAndUpdate(
    { user, balance: { $gte: value } },
    { $inc: { balance: -value } },
    { new: true }
  );
  if (!wallet) return { ok: false, balance: await getBalance(user) };

  await WalletTransaction.create({
    user,
    amount: -value,
    balanceAfter: wallet.balance,
    type,
    description,
    order: extra.order,
    actor: extra.actor,
  });

  return { ok: true, balance: wallet.balance };
};

/** Put back credit that was spent on an order that never completed. */
export const refundToWallet = async (
  user: UserRef,
  amount: number,
  description: string,
  order?: UserRef
): Promise<void> => {
  if (amount <= 0) return;
  await credit(user, amount, 'reversal', description, { order, once: true });
};
