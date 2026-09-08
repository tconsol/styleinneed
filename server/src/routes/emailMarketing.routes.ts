import { Router } from 'express';
import { getAudience, sendCampaign, exportAudience } from '../controllers/emailMarketing.controller';
import { protect, adminOrFeature } from '../middleware/auth';

const router = Router();

router.use(protect, adminOrFeature('email-marketing'));

router.get('/audience', getAudience);
router.get('/audience/export', exportAudience);
router.post('/send', sendCampaign);

export default router;
