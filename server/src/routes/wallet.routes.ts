import { Router } from 'express';
import {
  getMyWallet, redeemGiftCard, getMyReferral,
  listGiftCards, createGiftCards, deactivateGiftCard, adjustWallet, getUserWallet,
} from '../controllers/wallet.controller';
import { protect, isAdminOrManager } from '../middleware/auth';

const router = Router();

router.use(protect);

// Customer
router.get('/me', getMyWallet);
router.post('/redeem', redeemGiftCard);
router.get('/referral', getMyReferral);

// Admin — gift cards + manual balance corrections
router.get('/gift-cards', isAdminOrManager, listGiftCards);
router.post('/gift-cards', isAdminOrManager, createGiftCards);
router.patch('/gift-cards/:id/deactivate', isAdminOrManager, deactivateGiftCard);
router.post('/adjust', isAdminOrManager, adjustWallet);
router.get('/user/:id', isAdminOrManager, getUserWallet);

export default router;
