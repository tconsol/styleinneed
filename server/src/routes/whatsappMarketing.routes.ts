import { Router } from 'express';
import {
  getAudience, exportAudience, sendTestMessage, sendCampaign,
  listCampaigns, getCampaign, listOptOuts, addOptOuts, removeOptOuts,
  listTemplates, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
  downloadImportTemplate, importContacts, listImported, deleteImported,
  uploadCampaignMedia, deleteCampaign, deleteCampaigns, getMetaTemplates,
} from '../controllers/whatsappMarketing.controller';
import { protect, adminOrFeature } from '../middleware/auth';
import { sheetUpload, mediaUpload } from '../middleware/upload';

const router = Router();

// The whole console sits behind one feature key — it can reach every customer
// the store has, so it is not something to hand out casually.
router.use(protect, adminOrFeature('whatsapp-marketing'));

router.get('/audience', getAudience);
router.get('/audience/export', exportAudience);

router.post('/test', sendTestMessage);
router.post('/send', sendCampaign);

router.get('/import/template', downloadImportTemplate);
router.post('/import', sheetUpload.single('file'), importContacts);
router.get('/imported', listImported);
router.delete('/imported', deleteImported);

router.get('/meta-templates', getMetaTemplates);

router.get('/templates', listTemplates);
router.post('/templates', createTemplate);
router.patch('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);
router.post('/templates/:id/duplicate', duplicateTemplate);

router.post('/media', mediaUpload.single('file'), uploadCampaignMedia);

router.get('/campaigns', listCampaigns);
router.delete('/campaigns', deleteCampaigns);
router.get('/campaigns/:id', getCampaign);
router.delete('/campaigns/:id', deleteCampaign);

router.get('/opt-outs', listOptOuts);
router.post('/opt-outs', addOptOuts);
router.delete('/opt-outs', removeOptOuts);

export default router;
