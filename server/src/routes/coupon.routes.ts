import { Router } from 'express';
import { applyCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/coupon.controller';
import { protect, isAdminOrManager, adminOrFeature } from '../middleware/auth';

const router = Router();

router.post('/apply', protect, applyCoupon);
router.get('/', protect, adminOrFeature('coupons'), getCoupons);
router.post('/', protect, adminOrFeature('coupons'), createCoupon);
router.patch('/:id', protect, adminOrFeature('coupons'), updateCoupon);
router.delete('/:id', protect, adminOrFeature('coupons'), deleteCoupon);

export default router;
