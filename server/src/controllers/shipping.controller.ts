import { Request, Response, NextFunction } from 'express';
import ShippingRate from '../models/ShippingRate';
import Settings, { getSettings } from '../models/Settings';
import { ALL_NA_STATES } from '../data/naStates';
import { regionOf, currencyOf, resolveShipping } from '../utils/pricing';
import { IAddress } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

/** Idempotently preload every US + CA state (only inserts missing ones). */
export const ensureShippingRatesSeeded = async (): Promise<void> => {
  const count = await ShippingRate.countDocuments();
  if (count >= ALL_NA_STATES.length) return;
  const ops = ALL_NA_STATES.map((s) => ({
    updateOne: {
      filter: { country: s.country, stateCode: s.stateCode },
      update: { $setOnInsert: { stateName: s.stateName, charge: s.defaultCharge, isActive: true } },
      upsert: true,
    },
  }));
  await ShippingRate.bulkWrite(ops);
};

// Admin: all state rates (seeds on first open), grouped-friendly (sorted).
export const getShippingRates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ensureShippingRatesSeeded();
    const rates = await ShippingRate.find().sort({ country: 1, stateName: 1 }).lean();
    sendSuccess(res, 'Shipping rates', rates);
  } catch (err) {
    next(err);
  }
};

// Admin: update one state's charge / active flag.
export const updateShippingRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { charge, isActive } = req.body;
    const update: Record<string, unknown> = {};
    if (charge != null) update.charge = Number(charge);
    if (isActive != null) update.isActive = !!isActive;
    const rate = await ShippingRate.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!rate) { sendError(res, 'Rate not found', 404); return; }
    sendSuccess(res, 'Shipping rate updated', rate);
  } catch (err) {
    next(err);
  }
};

// Admin: bulk-set a flat charge for a whole country (convenience).
export const bulkSetCountryRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { country, charge } = req.body;
    if (!['US', 'CA'].includes(country)) { sendError(res, 'country must be US or CA', 400); return; }
    await ShippingRate.updateMany({ country }, { charge: Number(charge) });
    sendSuccess(res, 'Country rates updated');
  } catch (err) {
    next(err);
  }
};

// Public: shipping quote for a country/state + subtotal (used at checkout).
export const quoteShipping = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { country, state, subtotal } = req.query as Record<string, string>;
    const region = regionOf(country);
    const settings = await getSettings();
    const sub = Number(subtotal) || 0;
    if (region !== 'IN') await ensureShippingRatesSeeded();
    const charge = await resolveShipping(region, { state } as IAddress, sub, settings, false);
    const freeEligible = region === 'IN' && sub >= settings.indiaFreeShipThreshold;
    sendSuccess(res, 'Shipping quote', {
      region,
      currency: currencyOf(region),
      charge,
      freeShippingEligible: freeEligible,
      freeShippingThreshold: region === 'IN' ? settings.indiaFreeShipThreshold : null,
    });
  } catch (err) {
    next(err);
  }
};
