import { Router } from 'express';
import { subscribe, unsubscribe, getSubscribers, deleteSubscriber, broadcastPromotion } from '../controllers/newsletter.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/subscribers', protect, isAdminOrManager, getSubscribers);
router.delete('/subscribers/:id', protect, isAdminOrManager, deleteSubscriber);
router.post('/broadcast-promotion', protect, isAdminOrManager, broadcastPromotion);

export default router;
