import { Router } from 'express';
import {
  getProducts, getProductBySlug, getRelatedProducts,
  createProduct, updateProduct, deleteProduct,
  uploadProductImages, deleteProductImage, searchProducts,
} from '../controllers/product.controller';
import { protect, isProviderOrAdmin } from '../middleware/auth';
import { productUpload, sheetUpload } from '../middleware/upload';
import { cache, flushCache } from '../middleware/cache';
import { downloadTemplate, bulkUpload } from '../controllers/productBulk.controller';

const router = Router();

const flushProducts = flushCache('/api/v1/products');

// Bulk Excel import (before '/:slug' so these paths aren't captured as slugs)
router.get('/bulk/template', protect, isProviderOrAdmin, downloadTemplate);
router.post('/bulk/upload', protect, isProviderOrAdmin, flushProducts, sheetUpload.single('file'), bulkUpload);

router.get('/', cache(60), getProducts);
router.get('/search', searchProducts);
router.get('/:slug', cache(120), getProductBySlug);
router.get('/:slug/related', cache(120), getRelatedProducts);

router.post('/', protect, isProviderOrAdmin, flushProducts, createProduct);
router.patch('/:id', protect, isProviderOrAdmin, flushProducts, updateProduct);
router.delete('/:id', protect, isProviderOrAdmin, flushProducts, deleteProduct);
router.post('/upload/images', protect, isProviderOrAdmin, productUpload.array('images', 10), uploadProductImages);
router.delete('/upload/image', protect, isProviderOrAdmin, deleteProductImage);

export default router;
