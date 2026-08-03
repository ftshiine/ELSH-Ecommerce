import express from 'express';
import { loadCart, addToCart, updateQuantity, removeFromCart } from '../../controllers/user/cartController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/cart', requireAuth('user'), loadCart);
router.post('/cart/add/:productId', requireAuth('user'), addToCart);
router.put('/cart/update/:productId', requireAuth('user'), updateQuantity);
router.delete('/cart/remove/:productId', requireAuth('user'), removeFromCart);

export default router;
