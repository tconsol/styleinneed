import { Router } from 'express';
import { getProductReviews, createReview, approveReview, deleteReview, getAllReviews } from '../controllers/review.controller';
import { protect, isAdminOrManager, adminOrFeature } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';

const router = Router();
const flushReviews = flushCache('/api/v1/reviews');

router.get('/admin/all', protect, adminOrFeature('reviews'), getAllReviews);
router.get('/product/:productId', cache(120), getProductReviews);
router.post('/', protect, flushReviews, createReview);
router.patch('/:id/approve', protect, adminOrFeature('reviews'), flushReviews, approveReview);
router.delete('/:id', protect, adminOrFeature('reviews'), flushReviews, deleteReview);

export default router;
