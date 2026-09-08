import { Router } from 'express';
import { getCmsPage, upsertCmsPage, listCmsPages, uploadCmsImage } from '../controllers/cms.controller';
import { protect, adminOrFeature, isAnyStaff } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';
import { bannerUpload } from '../middleware/upload';

const router = Router();
const flushCms = flushCache('/api/v1/cms');

router.get('/', protect, adminOrFeature('cms'), listCmsPages);
// Shared by every admin page that attaches an image (blog covers, promo and
// announcement banners, CMS blocks), so it isn't tied to the 'cms' grant.
router.post('/upload', protect, isAnyStaff, bannerUpload.single('image'), uploadCmsImage);
router.get('/:key', cache(300), getCmsPage);
router.put('/:key', protect, adminOrFeature('cms'), flushCms, upsertCmsPage);

export default router;
