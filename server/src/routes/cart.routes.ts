import { Router } from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cart.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);
router.get('/', getCart);
router.post('/add', addToCart);
router.patch('/item/:productId', updateCartItem);
router.delete('/item/:productId', removeFromCart);
router.delete('/clear', clearCart);

export default router;
