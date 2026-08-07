import { Request, Response, NextFunction } from 'express';
import Category from '../models/Category';
import Collection from '../models/Collection';
import Product from '../models/Product';
import { uploadToGCS, deleteFromGCS } from '../config/gcs';
import { sendSuccess, sendError } from '../utils/apiResponse';

// Upload a single category image to GCS ('categories' folder). Returns the
// public URL — the admin then saves it on the category via updateCategory.
export const uploadCategoryImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { sendError(res, 'No image uploaded', 400); return; }
    const url = await uploadToGCS(file, 'categories');
    sendSuccess(res, 'Image uploaded', { url });
  } catch (err) {
    next(err);
  }
};

// Delete a category image from the bucket (used when the admin removes the
// image from the category form). Body: { url }.
export const deleteCategoryImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) { sendError(res, 'Image url required', 400); return; }
    await deleteFromGCS(url);
    sendSuccess(res, 'Image deleted');
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { includeInactive, productType, withCount } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = includeInactive === 'true' ? {} : { isActive: true };
    if (productType) filter.productType = productType;
    const categories = await Category.find(filter).sort('sortOrder name').lean();

    if (withCount === 'true') {
      const counts = await Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
      const withCounts = categories.map((cat) => ({ ...cat, productCount: countMap.get(cat._id.toString()) || 0 }));
      sendSuccess(res, 'Categories fetched', withCounts);
      return;
    }

    sendSuccess(res, 'Categories fetched', categories);
  } catch (err) {
    next(err);
  }
};

export const getCategoryBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) { sendError(res, 'Category not found', 404); return; }
    sendSuccess(res, 'Category fetched', category);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await Category.create(req.body);
    sendSuccess(res, 'Category created', category, 201);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) { sendError(res, 'Category not found', 404); return; }
    sendSuccess(res, 'Category updated', category);
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Category deleted');
  } catch (err) {
    next(err);
  }
};

export const getCollections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { includeInactive, featured } = req.query;
    const filter: Record<string, unknown> = includeInactive === 'true' ? {} : { isActive: true };
    if (featured === 'true') filter.isFeatured = true;

    const collections = await Collection.find(filter).sort('sortOrder name').lean();
    sendSuccess(res, 'Collections fetched', collections);
  } catch (err) {
    next(err);
  }
};

export const createCollection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const collection = await Collection.create(req.body);
    sendSuccess(res, 'Collection created', collection, 201);
  } catch (err) {
    next(err);
  }
};

export const updateCollection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!collection) { sendError(res, 'Collection not found', 404); return; }
    sendSuccess(res, 'Collection updated', collection);
  } catch (err) {
    next(err);
  }
};

export const deleteCollection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Collection.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Collection deleted');
  } catch (err) {
    next(err);
  }
};
