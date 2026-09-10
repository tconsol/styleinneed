import { Router } from 'express';
import {
  getAudience, sendCampaign, exportAudience,
  downloadImportTemplate, importContacts, listImported, deleteImported,
} from '../controllers/emailMarketing.controller';
import { protect, adminOrFeature } from '../middleware/auth';
import { sheetUpload } from '../middleware/upload';

const router = Router();

router.use(protect, adminOrFeature('email-marketing'));

router.get('/audience', getAudience);
router.get('/audience/export', exportAudience);
router.post('/send', sendCampaign);

router.get('/import/template', downloadImportTemplate);
router.post('/import', sheetUpload.single('file'), importContacts);
router.get('/imported', listImported);
router.delete('/imported', deleteImported);

export default router;
