import { Router } from 'express';
import { getPublicSettings, getAdminSettings, updateSettings, refreshExchangeRate } from '../controllers/settings.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.get('/', getPublicSettings);                                        // public: rate + India ship config
router.get('/admin', protect, isAdminOrManager, getAdminSettings);         // admin: full doc
router.patch('/', protect, isAdminOrManager, updateSettings);              // admin: update
router.post('/refresh-rate', protect, isAdminOrManager, refreshExchangeRate); // admin: force live-rate sync

export default router;
