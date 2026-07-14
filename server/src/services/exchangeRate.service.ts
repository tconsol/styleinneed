import axios from 'axios';
import Settings, { getSettings } from '../models/Settings';
import logger from '../utils/logger';

/**
 * Fetch the live USD→INR rate (how many rupees per $1) from a free, key-less
 * public API. Tries Frankfurter (ECB data) first, then open.er-api.com.
 */
export const fetchUsdInrRate = async (): Promise<number | null> => {
  // 1) Frankfurter (ECB) — https://api.frankfurter.dev
  try {
    const { data } = await axios.get('https://api.frankfurter.dev/v1/latest', {
      params: { base: 'USD', symbols: 'INR' }, timeout: 8000,
    });
    const r = Number(data?.rates?.INR);
    if (r > 0) return Math.round(r * 100) / 100;
  } catch { /* try fallback */ }

  // 2) open.er-api.com — https://open.er-api.com/v6/latest/USD
  try {
    const { data } = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
    const r = Number(data?.rates?.INR);
    if (data?.result === 'success' && r > 0) return Math.round(r * 100) / 100;
  } catch { /* give up */ }

  return null;
};

/**
 * Fetch the live rate and store it in Settings if it changed. Safe to call on
 * boot and on a schedule. Never throws — logs and returns.
 */
export const syncExchangeRate = async (): Promise<void> => {
  const rate = await fetchUsdInrRate();
  if (!rate) { logger.warn('Exchange-rate sync: could not fetch USD→INR rate'); return; }

  const settings = await getSettings();
  if (settings.usdExchangeRate === rate) {
    // No change — just record that we checked.
    await Settings.updateOne({ key: 'global' }, { rateUpdatedAt: new Date() });
    return;
  }

  const prev = settings.usdExchangeRate;
  await Settings.updateOne({ key: 'global' }, { usdExchangeRate: rate, rateUpdatedAt: new Date() });
  logger.info(`Exchange-rate updated: $1 = ₹${prev} → ₹${rate}`);
};

// Refresh every 6 hours (USD→INR moves ~daily). Cleared on shutdown.
const SIX_HOURS = 6 * 60 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | null = null;

export const startExchangeRateSync = (): void => {
  void syncExchangeRate();                       // once on boot
  timer = setInterval(() => void syncExchangeRate(), SIX_HOURS);
  if (typeof timer.unref === 'function') timer.unref();
};

export const stopExchangeRateSync = (): void => {
  if (timer) clearInterval(timer);
  timer = null;
};
