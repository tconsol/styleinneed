import { Router } from 'express';
import { subscribe, unsubscribe, getSubscribers } from '../controllers/newsletter.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/subscribers', protect, isAdminOrManager, getSubscribers);

export default router;
