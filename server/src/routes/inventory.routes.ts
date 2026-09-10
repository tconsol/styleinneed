import { Router } from 'express';
import { getInventory, getInventorySummary, bulkAdjustStock } from '../controllers/inventory.controller';
import { protect, adminOrFeature } from '../middleware/auth';

const router = Router();

router.use(protect, adminOrFeature('inventory'));

router.get('/', getInventory);
router.get('/summary', getInventorySummary);
router.post('/adjust', bulkAdjustStock);

export default router;
