import { Request, Response, NextFunction } from 'express';
import Provider from '../models/Provider';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

export const getProviders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search, category, isActive } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$text = { $search: search };

    const [items, total] = await Promise.all([
      Provider.find(filter).sort('-createdAt').skip(skip).limit(l).lean(),
      Provider.countDocuments(filter),
    ]);

    sendSuccess(res, 'Providers fetched', items, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) { next(err); }
};

export const getAllProvidersSimple = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const providers = await Provider.find({ isActive: true }).select('name category').sort('name').lean();
    sendSuccess(res, 'Providers', providers);
  } catch (err) { next(err); }
};

export const getProviderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) { sendError(res, 'Provider not found', 404); return; }
    sendSuccess(res, 'Provider', provider);
  } catch (err) { next(err); }
};

export const createProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = await Provider.create(req.body);
    sendSuccess(res, 'Provider created', provider, 201);
  } catch (err) { next(err); }
};

export const updateProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = await Provider.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!provider) { sendError(res, 'Provider not found', 404); return; }
    sendSuccess(res, 'Provider updated', provider);
  } catch (err) { next(err); }
};

export const deleteProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = await Provider.findByIdAndDelete(req.params.id);
    if (!provider) { sendError(res, 'Provider not found', 404); return; }
    sendSuccess(res, 'Provider deleted', null);
  } catch (err) { next(err); }
};
