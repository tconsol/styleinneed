import { Router } from 'express';
import {
  getSizeCharts, getSizeChartById, createSizeChart, updateSizeChart, deleteSizeChart,
} from '../controllers/sizeChart.controller';
import { protect, isAdminOrManager, adminOrFeature } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';

const router = Router();
const flushSizeCharts = flushCache('/api/v1/size-charts');

router.get('/', cache(300), getSizeCharts);
router.get('/:id', cache(300), getSizeChartById);
router.post('/', protect, adminOrFeature('size-charts'), flushSizeCharts, createSizeChart);
router.patch('/:id', protect, adminOrFeature('size-charts'), flushSizeCharts, updateSizeChart);
router.delete('/:id', protect, adminOrFeature('size-charts'), flushSizeCharts, deleteSizeChart);

export default router;
