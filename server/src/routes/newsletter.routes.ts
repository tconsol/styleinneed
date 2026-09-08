import { Router } from 'express';
import { subscribe, unsubscribe, getSubscribers, deleteSubscriber, broadcastPromotion } from '../controllers/newsletter.controller';
import { protect, isAdminOrManager, adminOrFeature } from '../middleware/auth';

const router = Router();

router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/subscribers', protect, adminOrFeature('newsletter'), getSubscribers);
router.delete('/subscribers/:id', protect, adminOrFeature('newsletter'), deleteSubscriber);
router.post('/broadcast-promotion', protect, adminOrFeature('newsletter'), broadcastPromotion);

export default router;
