import { Router } from 'express';
import { applyCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/coupon.controller';
import { protect, optionalAuth, isAdminOrManager, adminOrFeature } from '../middleware/auth';

const router = Router();

// Guests check out too — validating a code doesn't need an account.
router.post('/apply', optionalAuth, applyCoupon);
router.get('/', protect, adminOrFeature('coupons'), getCoupons);
router.post('/', protect, adminOrFeature('coupons'), createCoupon);
router.patch('/:id', protect, adminOrFeature('coupons'), updateCoupon);
router.delete('/:id', protect, adminOrFeature('coupons'), deleteCoupon);

export default router;
