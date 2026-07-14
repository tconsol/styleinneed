import { Router } from 'express';
import {
  getShippingRates, updateShippingRate, bulkSetCountryRate, quoteShipping,
} from '../controllers/shipping.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.get('/quote', quoteShipping);                                     // public: checkout quote
router.get('/', protect, isAdminOrManager, getShippingRates);            // admin: all state rates
router.patch('/bulk', protect, isAdminOrManager, bulkSetCountryRate);    // admin: set whole country
router.patch('/:id', protect, isAdminOrManager, updateShippingRate);     // admin: one state

export default router;
