import { Request, Response, NextFunction } from 'express';
import ProductType from '../models/ProductType';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getProductTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const types = await ProductType.find(filter).sort('sortOrder name').lean();
    sendSuccess(res, 'Product types fetched', types);
  } catch (err) {
    next(err);
  }
};

export const createProductType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = await ProductType.create(req.body);
    sendSuccess(res, 'Product type created', type, 201);
  } catch (err) {
    next(err);
  }
};

export const updateProductType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = await ProductType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!type) { sendError(res, 'Product type not found', 404); return; }
    sendSuccess(res, 'Product type updated', type);
  } catch (err) {
    next(err);
  }
};

export const deleteProductType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ProductType.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Product type deleted');
  } catch (err) {
    next(err);
  }
};
