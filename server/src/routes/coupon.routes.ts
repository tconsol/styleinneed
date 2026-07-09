import { Router } from 'express';
import { applyCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/coupon.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.post('/apply', protect, applyCoupon);
router.get('/', protect, isAdminOrManager, getCoupons);
router.post('/', protect, isAdminOrManager, createCoupon);
router.patch('/:id', protect, isAdminOrManager, updateCoupon);
router.delete('/:id', protect, isAdminOrManager, deleteCoupon);

export default router;
