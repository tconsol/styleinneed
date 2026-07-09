import { Router } from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlist.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);
router.get('/', getWishlist);
router.post('/:productId/toggle', toggleWishlist);

export default router;
