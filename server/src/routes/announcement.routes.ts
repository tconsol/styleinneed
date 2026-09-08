import { Router } from 'express';
import {
  getActiveAnnouncements, trackAnnouncementClick,
  createAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncements,
} from '../controllers/announcement.controller';
import { protect, isAdminOrManager, adminOrFeature } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';

const router = Router();
const flushAnnouncements = flushCache('/api/v1/announcements');

router.get('/active', cache(120), getActiveAnnouncements);
router.post('/:id/click', trackAnnouncementClick);
router.get('/', protect, adminOrFeature('announcements'), getAnnouncements);
router.post('/', protect, adminOrFeature('announcements'), flushAnnouncements, createAnnouncement);
router.patch('/:id', protect, adminOrFeature('announcements'), flushAnnouncements, updateAnnouncement);
router.delete('/:id', protect, adminOrFeature('announcements'), flushAnnouncements, deleteAnnouncement);

export default router;
