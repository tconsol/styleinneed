import { Router } from 'express';
import { protect, isAdminOrManager } from '../middleware/auth';
import {
  getProviders, getAllProvidersSimple, getProviderById,
  createProvider, updateProvider, deleteProvider,
} from '../controllers/provider.controller';

const router = Router();

router.use(protect, isAdminOrManager);

router.get('/',       getProviders);
router.get('/all',    getAllProvidersSimple);   // lightweight list for dropdowns
router.get('/:id',    getProviderById);
router.post('/',      createProvider);
router.patch('/:id',  updateProvider);
router.delete('/:id', deleteProvider);

export default router;
