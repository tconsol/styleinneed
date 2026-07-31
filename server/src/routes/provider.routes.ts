import { Router } from 'express';
import { protect, isAdminOrManager, isProviderOrAdmin } from '../middleware/auth';
import {
  getProviders, getAllProvidersSimple, getProviderById,
  createProvider, updateProvider, deleteProvider,
  getMyProviderProfile, updateMyProviderProfile,
} from '../controllers/provider.controller';

const router = Router();

router.use(protect);

// Lightweight dropdown list — allowed for providers too (used by the product form).
router.get('/all',    isProviderOrAdmin, getAllProvidersSimple);
// Provider self-service on their own business profile (must precede '/:id').
router.get('/me',     isProviderOrAdmin, getMyProviderProfile);
router.patch('/me',   isProviderOrAdmin, updateMyProviderProfile);
// Everything else (managing providers + their logins) is admin-only.
router.get('/',       isAdminOrManager, getProviders);
router.get('/:id',    isAdminOrManager, getProviderById);
router.post('/',      isAdminOrManager, createProvider);
router.patch('/:id',  isAdminOrManager, updateProvider);
router.delete('/:id', isAdminOrManager, deleteProvider);

export default router;
