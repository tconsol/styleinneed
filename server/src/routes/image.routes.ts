import { Router } from 'express';
import { getThumbnail } from '../controllers/image.controller';

const router = Router();

// Public: thumbnails are for the storefront, and the source is restricted to
// this store's own bucket inside the controller.
router.get('/thumb', getThumbnail);

export default router;
