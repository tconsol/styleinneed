import { Router } from 'express';
import { getPublicSettings, getAdminSettings, updateSettings } from '../controllers/settings.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.get('/', getPublicSettings);                                   // public: rate + India ship config
router.get('/admin', protect, isAdminOrManager, getAdminSettings);    // admin: full doc
router.patch('/', protect, isAdminOrManager, updateSettings);         // admin: update

export default router;
