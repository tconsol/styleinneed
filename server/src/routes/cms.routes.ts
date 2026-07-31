import { Router } from 'express';
import { getCmsPage, upsertCmsPage, listCmsPages, uploadCmsImage } from '../controllers/cms.controller';
import { protect, isAdmin } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';
import { bannerUpload } from '../middleware/upload';

const router = Router();
const flushCms = flushCache('/api/v1/cms');

router.get('/', protect, isAdmin, listCmsPages);
router.post('/upload', protect, isAdmin, bannerUpload.single('image'), uploadCmsImage);
router.get('/:key', cache(300), getCmsPage);
router.put('/:key', protect, isAdmin, flushCms, upsertCmsPage);

export default router;
