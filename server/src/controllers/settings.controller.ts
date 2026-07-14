import { Request, Response, NextFunction } from 'express';
import Settings, { getSettings } from '../models/Settings';
import { sendSuccess } from '../utils/apiResponse';

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
