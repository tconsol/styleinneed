import mongoose, { Schema, Document } from 'mongoose';

// Single global settings document. Fetched via a fixed key so there is only
// ever one row. Holds store-wide config the admin can tune without a redeploy.
export interface ISettings extends Document {
  key: string;
  usdExchangeRate: number;       // 1 INR = (1 / rate) USD  -> usd = inr / rate
  indiaFreeShipThreshold: number; // INR subtotal at/above which India shipping is free
  indiaFlatShipping: number;      // INR flat shipping below the threshold
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: 'global', unique: true },
    // How many INR per 1 USD (e.g. 83 => $1 = ₹83). USD price = INR / rate.
    usdExchangeRate: { type: Number, default: 83, min: 1 },
    indiaFreeShipThreshold: { type: Number, default: 999, min: 0 },
    indiaFlatShipping: { type: Number, default: 99, min: 0 },
  },
  { timestamps: true }
);

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

/** Fetch-or-create the singleton settings document. */
export const getSettings = async (): Promise<ISettings> => {
  let doc = await Settings.findOne({ key: 'global' });
  if (!doc) doc = await Settings.create({ key: 'global' });
  return doc;
};

export default Settings;
