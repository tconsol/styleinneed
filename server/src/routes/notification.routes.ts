import { Router } from 'express';
import { protect, isAdminOrManager } from '../middleware/auth';
import {
  registerPushToken,
  removePushToken,
  getNotifications,
  markAllRead,
  markRead,
  broadcastPush,
  getBroadcastStats,
} from '../controllers/notification.controller';

const router = Router();

router.use(protect);

// User routes
router.post('/push-token', registerPushToken);
router.delete('/push-token', removePushToken);
router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

// Admin-only broadcast routes
router.post('/broadcast', isAdminOrManager, broadcastPush);
router.get('/broadcast/stats', isAdminOrManager, getBroadcastStats);

export default router;
