import { Router } from 'express';
import {
  getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory,
  getCollections, createCollection, updateCollection, deleteCollection,
} from '../controllers/category.controller';
import {
  getProductTypes, createProductType, updateProductType, deleteProductType,
} from '../controllers/producttype.controller';
import {
  getAttributes, createAttribute, updateAttribute, deleteAttribute,
} from '../controllers/attribute.controller';
import { protect, isAdminOrManager } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';

const router = Router();

// Catalog config rarely changes — cache GETs 5 min; flush on any catalog write.
const cacheCatalog = cache(300);
const flushCatalog = flushCache('/api/v1/catalog');

router.get('/categories', cacheCatalog, getCategories);
router.get('/categories/:slug', cacheCatalog, getCategoryBySlug);
router.post('/categories', protect, isAdminOrManager, flushCatalog, createCategory);
router.patch('/categories/:id', protect, isAdminOrManager, flushCatalog, updateCategory);
router.delete('/categories/:id', protect, isAdminOrManager, flushCatalog, deleteCategory);

router.get('/collections', cacheCatalog, getCollections);
router.post('/collections', protect, isAdminOrManager, flushCatalog, createCollection);
router.patch('/collections/:id', protect, isAdminOrManager, flushCatalog, updateCollection);
router.delete('/collections/:id', protect, isAdminOrManager, flushCatalog, deleteCollection);

// Product types (admin-managed, WordPress-style)
router.get('/product-types', cacheCatalog, getProductTypes);
router.post('/product-types', protect, isAdminOrManager, flushCatalog, createProductType);
router.patch('/product-types/:id', protect, isAdminOrManager, flushCatalog, updateProductType);
router.delete('/product-types/:id', protect, isAdminOrManager, flushCatalog, deleteProductType);

// Attributes (dynamic taxonomy)
router.get('/attributes', cacheCatalog, getAttributes);
router.post('/attributes', protect, isAdminOrManager, flushCatalog, createAttribute);
router.patch('/attributes/:id', protect, isAdminOrManager, flushCatalog, updateAttribute);
router.delete('/attributes/:id', protect, isAdminOrManager, flushCatalog, deleteAttribute);

export default router;
