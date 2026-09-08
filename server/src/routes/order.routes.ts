import { Router } from 'express';
import {
  createOrder, verifyPayment, verifyStripePayment, getPaymentConfig,
  getMyOrders, getOrderById, cancelOrder, deleteMyOrder, getGuestOrder,
} from '../controllers/order.controller';
import { protect, optionalAuth } from '../middleware/auth';

const router = Router();

// ── Checkout: open to guests as well as signed-in shoppers ──
// `optionalAuth` attaches req.user when a token is present; the controllers
// branch on that. Guests supply their email + address + items in the body and
// prove ownership of a payment session with the token issued at creation.
router.get('/payment-config', optionalAuth, getPaymentConfig);
router.post('/', optionalAuth, createOrder);
router.post('/verify-payment', optionalAuth, verifyPayment);
router.post('/verify-stripe-payment', optionalAuth, verifyStripePayment);
router.get('/guest/:id', getGuestOrder); // token-scoped, no session needed

// ── Account area: always requires a login ──
router.get('/my', protect, getMyOrders);   // must be before /:id
router.get('/:id', protect, getOrderById);
router.patch('/:id/cancel', protect, cancelOrder);
router.delete('/:id', protect, deleteMyOrder);

router.get('/verify-payment', (_, res) => res.status(405).json({ success: false, message: 'Use POST for payment verification' }));

export default router;
