import { Router } from 'express';
import { createReturn, getMyReturns, getAllReturns, updateReturnStatus, retryReturnRefund } from '../controllers/return.controller';
import { protect, isAdminOrManager, adminOrFeature } from '../middleware/auth';

const router = Router();

router.post('/', protect, createReturn);
router.get('/my', protect, getMyReturns);
router.get('/', protect, adminOrFeature('returns'), getAllReturns);
router.patch('/:id/status', protect, adminOrFeature('returns'), updateReturnStatus);
router.post('/:id/refund/retry', protect, adminOrFeature('returns'), retryReturnRefund);

export default router;
