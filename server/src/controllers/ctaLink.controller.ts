import { Request, Response, NextFunction } from 'express';
import CtaLink from '../models/CtaLink';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getCtaLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter = req.query.includeInactive === 'true' ? {} : { isActive: true };
    const links = await CtaLink.find(filter).sort('sortOrder group label').lean();
    sendSuccess(res, 'CTA links fetched', links);
  } catch (err) {
    next(err);
  }
};

export const createCtaLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { label, url, group } = req.body;
    const link = await CtaLink.create({ label, url, group: group || 'Custom', source: 'custom' });
    sendSuccess(res, 'CTA link created', link, 201);
  } catch (err) {
    next(err);
  }
};

export const updateCtaLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const link = await CtaLink.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!link) { sendError(res, 'CTA link not found', 404); return; }
    sendSuccess(res, 'CTA link updated', link);
  } catch (err) {
    next(err);
  }
};

export const deleteCtaLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const link = await CtaLink.findById(req.params.id);
    if (!link) { sendError(res, 'CTA link not found', 404); return; }
    // Auto-managed product-type links are tied to their type — remove the type instead.
    if (link.source === 'productType') { sendError(res, 'This link is managed by its product type', 400); return; }
    await link.deleteOne();
    sendSuccess(res, 'CTA link deleted');
  } catch (err) {
    next(err);
  }
};
