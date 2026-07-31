import mongoose, { Schema, Document } from 'mongoose';
import { ThemeTokens } from '../config/themePresets';

// Single global settings document. Fetched via a fixed key so there is only
// ever one row. Holds store-wide config the admin can tune without a redeploy.
export interface ISettings extends Document {
  key: string;
  usdExchangeRate: number;       // 1 INR = (1 / rate) USD  -> usd = inr / rate
  rateUpdatedAt?: Date;          // when the live rate was last synced
  indiaFreeShipThreshold: number; // INR subtotal at/above which India shipping is free
  indiaFlatShipping: number;      // INR flat shipping below the threshold
  activeTheme: string;           // key of the currently applied theme
  themes: ThemeTokens[];         // editable themes (seeded from presets on first read)
  fontHeading: string;           // heading font family (Google font name)
  fontBody: string;              // body font family
  applyToAdmin: boolean;         // also apply theme+font to the admin panel
  updatedAt: Date;
}

const themeSchema = new Schema<ThemeTokens>({
  key: { type: String, required: true },
  name: { type: String, required: true },
  primary: String, primaryLight: String, primaryDark: String,
  secondary: String, secondaryLight: String, secondaryDark: String,
  bg: String, surface: String, text: String, muted: String, border: String,
}, { _id: false });

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: 'global', unique: true },
    // How many INR per 1 USD (e.g. 83 => $1 = ₹83). USD price = INR / rate.
    // Auto-synced from a public FX API; admin can still override manually.
    usdExchangeRate: { type: Number, default: 83, min: 1 },
    rateUpdatedAt: Date,
    indiaFreeShipThreshold: { type: Number, default: 999, min: 0 },
    indiaFlatShipping: { type: Number, default: 99, min: 0 },
    activeTheme: { type: String, default: 'indigo' },
    themes: { type: [themeSchema], default: [] },
    fontHeading: { type: String, default: 'Poppins' },
    fontBody: { type: String, default: 'Inter' },
    applyToAdmin: { type: Boolean, default: true },
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
