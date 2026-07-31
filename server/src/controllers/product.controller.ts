import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Category from '../models/Category';
import Collection from '../models/Collection';
import Attribute from '../models/Attribute';
import { nextSeq } from '../models/Counter';
import { AuthRequest } from '../types';
import { uploadToGCS, deleteFromGCS } from '../config/gcs';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { createError } from '../middleware/errorHandler';

// Short uppercase code from a string, e.g. "Silk Sarees" -> "SIL", "jewellery" -> "JEW"
const code = (s: string, n = 3) =>
  (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, n) || 'GEN';

/**
 * Auto-generate unique SKUs for any variant left blank.
 * Pattern: AVY-<TYPE>-<CATEGORY>-<PRODUCT#>-<VARIANT#>  e.g. AVY-JEW-NEC-00042-01
 *
 * - One product number per product (from an atomic counter → never collides).
 * - On edit, reuses the product's existing number and continues the variant
 *   counter, so all variants of a product stay under the same number.
 * - Existing (non-blank) SKUs are never changed — they're referenced by carts
 *   and past orders, so they must stay stable.
 */
const SKU_RE = /^(AVY-[A-Z0-9]+-[A-Z0-9]+-\d+)-(\d+)$/;

/**
 * Production SKU pipeline — run before create/update:
 *  1. Normalize every provided SKU (trim + uppercase).
 *  2. Auto-fill blank SKUs (one product number per product, continuing the
 *     variant counter on edit). Existing SKUs are never changed.
 *  3. Validate: no duplicates within the product, and no SKU already used by
 *     another product — with clear 409 messages instead of raw E11000.
 * A unique index on `variants.sku` is the final hard guarantee at the DB layer.
 */
const prepareSkus = async (body: Record<string, any>, currentId?: string): Promise<void> => {
  const variants: any[] = body.variants || [];
  if (!variants.length) return;

  // 1. Normalize
  for (const v of variants) {
    if (v?.sku) v.sku = String(v.sku).trim().toUpperCase();
  }

  // 2. Auto-fill blanks
  if (variants.some((v) => !v?.sku)) {
    let base = '';
    let maxIdx = 0;
    for (const v of variants) {
      const m = String(v?.sku || '').match(SKU_RE);
      if (m) { base = m[1]; maxIdx = Math.max(maxIdx, Number(m[2])); }
    }
    if (!base) {
      let catName = '';
      if (body.category && isObjectId(String(body.category))) {
        const cat = await Category.findById(body.category).select('name').lean();
        catName = cat?.name || '';
      }
      const seq = await nextSeq('product-sku');
      base = `AVY-${code(body.productType || 'GEN')}-${code(catName || 'GEN')}-${String(seq).padStart(5, '0')}`;
    }
    let idx = maxIdx;
    for (const v of variants) {
      if (!v.sku) { idx += 1; v.sku = `${base}-${String(idx).padStart(2, '0')}`; }
    }
  }

  // 3. Validate
  const skus = variants.map((v) => v.sku as string);
  const dup = skus.find((s, i) => skus.indexOf(s) !== i);
  if (dup) throw createError(`Duplicate SKU within this product: ${dup}`, 409);

  const query: Record<string, unknown> = { 'variants.sku': { $in: skus } };
  if (currentId) query._id = { $ne: currentId };
  const clash = await Product.findOne(query).select('variants.sku name').lean();
  if (clash) {
    const taken = (clash.variants as { sku: string }[]).find((v) => skus.includes(v.sku));
    throw createError(`SKU already in use by "${clash.name}": ${taken?.sku}`, 409);
  }
};

// Query params handled explicitly — everything else is treated as a potential
// dynamic attribute filter (attribute slug -> comma-separated values).
const RESERVED_PARAMS = new Set([
  'page', 'limit', 'sort', 'category', 'collection', 'minPrice', 'maxPrice',
  'search', 'isFeatured', 'isNewArrival', 'isBestSeller', 'isTrending', 'tags',
  'productType', 'minWeight', 'maxWeight',
]);

const isObjectId = (v: string) => mongoose.Types.ObjectId.isValid(v) && v.length === 24;

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page, limit, sort = '-createdAt', category, collection,
      minPrice, maxPrice, search, isFeatured, isNewArrival,
      isBestSeller, isTrending, tags,
      productType, minWeight, maxWeight,
    } = req.query as Record<string, string>;

    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = { isActive: true };

    // Accept category/collection as ObjectId OR slug
    if (category) {
      if (isObjectId(category)) {
        filter.category = category;
      } else {
        const cat = await Category.findOne({ slug: category }).select('_id').lean();
        if (cat) filter.category = cat._id;
        else filter.category = null; // no match → 0 results, not an error
      }
    }
    if (collection) {
      if (isObjectId(collection)) {
        filter.collections = collection;
      } else {
        const col = await Collection.findOne({ slug: collection }).select('_id').lean();
        if (col) filter.collections = col._id;
        else filter.collections = null;
      }
    }
    if (isFeatured) filter.isFeatured = isFeatured === 'true';
    if (isNewArrival) filter.isNewArrival = isNewArrival === 'true';
    if (isBestSeller) filter.isBestSeller = isBestSeller === 'true';
    if (isTrending) filter.isTrending = isTrending === 'true';
    if (tags) filter.tags = { $in: tags.split(',') };

    // Catalog type + numeric weight range
    if (productType) filter.productType = productType;
    if (minWeight || maxWeight) {
      filter.weightGrams = {};
      if (minWeight) (filter.weightGrams as Record<string, unknown>).$gte = Number(minWeight);
      if (maxWeight) (filter.weightGrams as Record<string, unknown>).$lte = Number(maxWeight);
    }

    // Dynamic attribute filters: any non-reserved query param matching an active
    // filterable attribute slug → attributes.<slug> (product) or variants.attributes.<slug>.
    const attrParams = Object.keys(req.query).filter((k) => !RESERVED_PARAMS.has(k));
    if (attrParams.length) {
      const attrs = await Attribute.find({ isActive: true, isFilterable: true })
        .select('slug level').lean();
      const levelBySlug = new Map(attrs.map((a) => [a.slug, a.level]));
      for (const key of attrParams) {
        const level = levelBySlug.get(key);
        if (!level) continue;
        const raw = req.query[key];
        const values = String(raw).split(',').filter(Boolean);
        if (!values.length) continue;
        const path = level === 'variant' ? `variants.attributes.${key}` : `attributes.${key}`;
        filter[path] = { $in: values };
      }
    }

    if (minPrice || maxPrice) {
      filter.salePrice = {};
      if (minPrice) (filter.salePrice as Record<string, unknown>).$gte = Number(minPrice);
      if (maxPrice) (filter.salePrice as Record<string, unknown>).$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('collections', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(l)
        .lean(),
      Product.countDocuments(filter),
    ]);

    sendSuccess(res, 'Products fetched', products, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug')
      .populate('collections', 'name slug')
      .populate('sizeChartId');

    if (!product) { sendError(res, 'Product not found', 404); return; }
    sendSuccess(res, 'Product fetched', product);
  } catch (err) {
    next(err);
  }
};

export const getRelatedProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) { sendError(res, 'Product not found', 404); return; }

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(8)
      .select('name slug images salePrice mrp discountPercentage ratings variants category')
      .populate('category', 'name slug')
      .lean();

    sendSuccess(res, 'Related products', related);
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // A provider adding a product is always tied to their own provider record.
    if (req.user?.role === 'provider' && req.user.providerRef) {
      req.body.provider = req.user.providerRef;
    }
    await prepareSkus(req.body);
    const product = await Product.create(req.body);
    if (product.isActive) emitEvent(SOCKET_EVENTS.productCreated, { slug: product.slug });
    sendSuccess(res, 'Product created', product, 201);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // A provider may only edit their own products, and can't reassign ownership.
    if (req.user?.role === 'provider') {
      const existing = await Product.findById(req.params.id).select('provider');
      if (!existing || String(existing.provider) !== String(req.user.providerRef)) {
        sendError(res, 'Forbidden', 403); return;
      }
      req.body.provider = req.user.providerRef;
    }
    await prepareSkus(req.body, req.params.id);
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!product) { sendError(res, 'Product not found', 404); return; }
    emitEvent(SOCKET_EVENTS.productUpdated, { slug: product.slug });
    sendSuccess(res, 'Product updated', product);
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) { sendError(res, 'Product not found', 404); return; }

    // Providers may only delete their own products.
    if (req.user?.role === 'provider' && String(product.provider) !== String(req.user.providerRef)) {
      sendError(res, 'Forbidden', 403); return;
    }

    // Purge all of this product's images from the bucket (product + variant level)
    const urls = new Set<string>([
      ...(product.images || []),
      ...product.variants.flatMap((v) => v.images || []),
    ]);
    await Promise.all([...urls].map((u) => deleteFromGCS(u)));

    // Hard-delete the product from the database.
    await product.deleteOne();
    emitEvent(SOCKET_EVENTS.productDeleted, { slug: product.slug });
    sendSuccess(res, 'Product deleted');
  } catch (err) {
    next(err);
  }
};

export const uploadProductImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { sendError(res, 'No images uploaded', 400); return; }

    const urls = await Promise.all(files.map((f) => uploadToGCS(f, 'products')));
    sendSuccess(res, 'Images uploaded', { urls });
  } catch (err) {
    next(err);
  }
};

// Delete a single image from the bucket (used when an admin removes an image
// from the product form). Body: { url }.
export const deleteProductImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) { sendError(res, 'Image url required', 400); return; }
    await deleteFromGCS(url);
    sendSuccess(res, 'Image deleted');
  } catch (err) {
    next(err);
  }
};

export const searchProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q, page, limit } = req.query as Record<string, string>;
    if (!q) { sendError(res, 'Search query required', 400); return; }

    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [products, total] = await Promise.all([
      Product.find({ $text: { $search: q }, isActive: true }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(l)
        .select('name slug images salePrice mrp discountPercentage ratings variants category')
        .populate('category', 'name slug')
        .lean(),
      Product.countDocuments({ $text: { $search: q }, isActive: true }),
    ]);

    sendSuccess(res, 'Search results', products, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};
