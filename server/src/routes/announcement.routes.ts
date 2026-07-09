import { Router } from 'express';
import {
  getActiveAnnouncements, trackAnnouncementClick,
  createAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncements,
} from '../controllers/announcement.controller';
import { protect, isAdminOrManager } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';

const router = Router();
const flushAnnouncements = flushCache('/api/v1/announcements');

router.get('/active', cache(120), getActiveAnnouncements);
router.post('/:id/click', trackAnnouncementClick);
router.get('/', protect, isAdminOrManager, getAnnouncements);
router.post('/', protect, isAdminOrManager, flushAnnouncements, createAnnouncement);
router.patch('/:id', protect, isAdminOrManager, flushAnnouncements, updateAnnouncement);
router.delete('/:id', protect, isAdminOrManager, flushAnnouncements, deleteAnnouncement);

export default router;
