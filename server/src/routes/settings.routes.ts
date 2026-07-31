import { Router } from 'express';
import {
  getPublicSettings, getAdminSettings, updateSettings, refreshExchangeRate,
  getActiveTheme, getThemes, setActiveTheme, saveTheme, deleteTheme, updateAppearance,
} from '../controllers/settings.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.get('/', getPublicSettings);                                        // public: rate + India ship config
router.get('/theme', getActiveTheme);                                      // public: active theme tokens
router.get('/admin', protect, isAdminOrManager, getAdminSettings);         // admin: full doc
router.patch('/', protect, isAdminOrManager, updateSettings);              // admin: update
router.post('/refresh-rate', protect, isAdminOrManager, refreshExchangeRate); // admin: force live-rate sync

// Theme management (admin)
router.get('/themes', protect, isAdminOrManager, getThemes);
router.put('/appearance', protect, isAdminOrManager, updateAppearance);
router.put('/themes/active', protect, isAdminOrManager, setActiveTheme);
router.put('/themes', protect, isAdminOrManager, saveTheme);
router.delete('/themes/:key', protect, isAdminOrManager, deleteTheme);

export default router;
