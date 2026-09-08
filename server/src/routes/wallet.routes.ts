import { Router } from 'express';
import {
  getMyWallet, redeemGiftCard, getMyReferral,
  listGiftCards, createGiftCards, deactivateGiftCard, adjustWallet, getUserWallet,
} from '../controllers/wallet.controller';
import { protect, isAdminOrManager, adminOrFeature } from '../middleware/auth';

const router = Router();

router.use(protect);

// Customer
router.get('/me', getMyWallet);
router.post('/redeem', redeemGiftCard);
router.get('/referral', getMyReferral);

// Admin — gift cards + manual balance corrections
router.get('/gift-cards', adminOrFeature('gift-cards'), listGiftCards);
router.post('/gift-cards', adminOrFeature('gift-cards'), createGiftCards);
router.patch('/gift-cards/:id/deactivate', adminOrFeature('gift-cards'), deactivateGiftCard);
router.post('/adjust', isAdminOrManager, adjustWallet);
router.get('/user/:id', adminOrFeature('customers'), getUserWallet);

export default router;
