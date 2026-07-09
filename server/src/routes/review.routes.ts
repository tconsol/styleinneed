import { Router } from 'express';
import { getProductReviews, createReview, approveReview, deleteReview, getAllReviews } from '../controllers/review.controller';
import { protect, isAdminOrManager } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';

const router = Router();
const flushReviews = flushCache('/api/v1/reviews');

router.get('/admin/all', protect, isAdminOrManager, getAllReviews);
router.get('/product/:productId', cache(120), getProductReviews);
router.post('/', protect, flushReviews, createReview);
router.patch('/:id/approve', protect, isAdminOrManager, flushReviews, approveReview);
router.delete('/:id', protect, isAdminOrManager, flushReviews, deleteReview);

export default router;
