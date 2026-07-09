import { Request, Response, NextFunction } from 'express';
import Attribute from '../models/Attribute';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getAttributes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { includeInactive, filterable, productType } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = includeInactive === 'true' ? {} : { isActive: true };
    if (filterable === 'true') filter.isFilterable = true;
    // productType match: attribute applies to all ([]) OR includes this slug
    if (productType) filter.$or = [{ productTypes: { $size: 0 } }, { productTypes: productType }];

    const attributes = await Attribute.find(filter).sort('sortOrder name').lean();
    sendSuccess(res, 'Attributes fetched', attributes);
  } catch (err) {
    next(err);
  }
};

export const createAttribute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attribute = await Attribute.create(req.body);
    sendSuccess(res, 'Attribute created', attribute, 201);
  } catch (err) {
    next(err);
  }
};

export const updateAttribute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attribute = await Attribute.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!attribute) { sendError(res, 'Attribute not found', 404); return; }
    sendSuccess(res, 'Attribute updated', attribute);
  } catch (err) {
    next(err);
  }
};

export const deleteAttribute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Attribute.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Attribute deleted');
  } catch (err) {
    next(err);
  }
};
