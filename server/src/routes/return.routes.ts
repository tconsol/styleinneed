import { Router } from 'express';
import { createReturn, getMyReturns, getAllReturns, updateReturnStatus } from '../controllers/return.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.post('/', protect, createReturn);
router.get('/my', protect, getMyReturns);
router.get('/', protect, isAdminOrManager, getAllReturns);
router.patch('/:id/status', protect, isAdminOrManager, updateReturnStatus);

export default router;
