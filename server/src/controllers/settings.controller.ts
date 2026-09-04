import { Request, Response, NextFunction } from 'express';
import Settings, { getSettings } from '../models/Settings';
import { syncExchangeRate } from '../services/exchangeRate.service';
import { PRESET_THEMES, THEME_FIELDS, ThemeTokens } from '../config/themePresets';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { sendSuccess, sendError } from '../utils/apiResponse';

// The full appearance payload: active colours + fonts + the admin-apply flag.
// Exported so other modules (e.g. the newsletter broadcast) can theme
// server-rendered HTML (emails) to match the storefront's active theme.
export const getAppearance = async () => {
  const { themes, activeTheme } = await resolveThemes();
  const s = await getSettings();
  return {
    ...activeTokens(themes, activeTheme),
    fontHeading: s.fontHeading,
    fontBody: s.fontBody,
    applyToAdmin: s.applyToAdmin,
  };
};

// Push the resolved appearance to every connected client so both apps update
// live without a refresh.
const broadcastActiveTheme = async (): Promise<void> => {
  emitEvent(SOCKET_EVENTS.themeChanged, await getAppearance());
};

// Resolve the editable theme list: seed from presets on first use so admins
// always have something to pick from and edit.
const resolveThemes = async (): Promise<{ themes: ThemeTokens[]; activeTheme: string }> => {
  const s = await getSettings();
  const stored = s.themes || [];
  // Merge in any built-in presets not already stored, so new presets ship in
  // automatically without clobbering admin-edited themes.
  const have = new Set(stored.map((t) => t.key));
  const missing = PRESET_THEMES.filter((p) => !have.has(p.key)).map((t) => ({ ...t }));
  if (missing.length) {
    s.themes = [...stored, ...missing];
    s.markModified('themes');
    await s.save();
  }
  return { themes: s.themes, activeTheme: s.activeTheme };
};

// Return a PLAIN object (not a Mongoose subdocument) so JSON responses don't
// leak internals like __parentArray and the client sees real hex values.
const toPlain = (t: ThemeTokens): ThemeTokens => {
  const src = (t as unknown as { toObject?: () => ThemeTokens }).toObject?.() ?? t;
  const out = { key: src.key, name: src.name } as ThemeTokens;
  THEME_FIELDS.forEach((f) => { (out as unknown as Record<string, string>)[f] = (src as unknown as Record<string, string>)[f]; });
  return out;
};

const activeTokens = (themes: ThemeTokens[], activeKey: string): ThemeTokens =>
  toPlain(themes.find((t) => t.key === activeKey) || themes[0] || PRESET_THEMES[0]);

// Public: values the storefront/mobile need to render prices & India shipping.
export const getPublicSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const s = await getSettings();
    sendSuccess(res, 'Settings', {
      usdExchangeRate: s.usdExchangeRate,
      indiaFreeShipThreshold: s.indiaFreeShipThreshold,
      indiaFlatShipping: s.indiaFlatShipping,
    });
  } catch (err) {
    next(err);
  }
};

// Admin: read the full settings doc.
export const getAdminSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, 'Settings', await getSettings());
  } catch (err) {
    next(err);
  }
};

// Admin: update settings.
export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { usdExchangeRate, indiaFreeShipThreshold, indiaFlatShipping } = req.body;
    const update: Record<string, number> = {};
    if (usdExchangeRate != null) update.usdExchangeRate = Number(usdExchangeRate);
    if (indiaFreeShipThreshold != null) update.indiaFreeShipThreshold = Number(indiaFreeShipThreshold);
    if (indiaFlatShipping != null) update.indiaFlatShipping = Number(indiaFlatShipping);

    const doc = await Settings.findOneAndUpdate({ key: 'global' }, update, { new: true, upsert: true });
    sendSuccess(res, 'Settings updated', doc);
  } catch (err) {
    next(err);
  }
};

// Public: active theme tokens + fonts + admin-apply flag — both apps apply these.
export const getActiveTheme = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, 'Active theme', await getAppearance());
  } catch (err) {
    next(err);
  }
};

// Admin: all themes + active + fonts + apply flag (for the Themes manager).
export const getThemes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { themes, activeTheme } = await resolveThemes();
    const s = await getSettings();
    sendSuccess(res, 'Themes', {
      themes: themes.map(toPlain), activeTheme,
      fontHeading: s.fontHeading, fontBody: s.fontBody, applyToAdmin: s.applyToAdmin,
    });
  } catch (err) {
    next(err);
  }
};

// Admin: update fonts and/or the admin-apply toggle.
export const updateAppearance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fontHeading, fontBody, applyToAdmin } = req.body as {
      fontHeading?: string; fontBody?: string; applyToAdmin?: boolean;
    };
    const update: Record<string, unknown> = {};
    if (typeof fontHeading === 'string') update.fontHeading = fontHeading;
    if (typeof fontBody === 'string') update.fontBody = fontBody;
    if (typeof applyToAdmin === 'boolean') update.applyToAdmin = applyToAdmin;
    await Settings.findOneAndUpdate({ key: 'global' }, update, { new: true, upsert: true });
    await broadcastActiveTheme();
    sendSuccess(res, 'Appearance updated', await getAppearance());
  } catch (err) {
    next(err);
  }
};

// Admin: switch the active theme.
export const setActiveTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.body as { key?: string };
    const { themes } = await resolveThemes();
    if (!key || !themes.some((t) => t.key === key)) { sendError(res, 'Unknown theme', 400); return; }
    const doc = await Settings.findOneAndUpdate({ key: 'global' }, { activeTheme: key }, { new: true });
    await broadcastActiveTheme();
    sendSuccess(res, 'Active theme updated', { activeTheme: doc?.activeTheme });
  } catch (err) {
    next(err);
  }
};

// Admin: create or update a theme (upsert by key).
export const saveTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Partial<ThemeTokens>;
    const key = String(body.key || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!key) { sendError(res, 'Theme key required', 400); return; }
    if (!body.name) { sendError(res, 'Theme name required', 400); return; }

    const s = await getSettings();
    if (!s.themes || s.themes.length === 0) s.themes = PRESET_THEMES.map((t) => ({ ...t }));

    const clean = { key, name: String(body.name) } as ThemeTokens;
    THEME_FIELDS.forEach((f) => { (clean as unknown as Record<string, string>)[f] = String(body[f] ?? '#000000'); });

    const idx = s.themes.findIndex((t) => t.key === key);
    if (idx >= 0) s.themes[idx] = clean; else s.themes.push(clean);
    s.markModified('themes');
    await s.save();
    if (s.activeTheme === key) await broadcastActiveTheme();
    sendSuccess(res, 'Theme saved', clean);
  } catch (err) {
    next(err);
  }
};

// Admin: delete a custom theme.
export const deleteTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.params;
    const s = await getSettings();
    s.themes = (s.themes || []).filter((t) => t.key !== key);
    if (s.activeTheme === key) s.activeTheme = s.themes[0]?.key || 'indigo';
    s.markModified('themes');
    await s.save();
    await broadcastActiveTheme();
    sendSuccess(res, 'Theme deleted', { activeTheme: s.activeTheme });
  } catch (err) {
    next(err);
  }
};

// Admin: force-fetch the live USD→INR rate right now.
export const refreshExchangeRate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await syncExchangeRate();
    sendSuccess(res, 'Exchange rate refreshed', await getSettings());
  } catch (err) {
    next(err);
  }
};
