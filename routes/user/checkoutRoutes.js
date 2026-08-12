import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { loadCheckout, placeOrder, loadSuccess, startDirectCheckout } from '../../controllers/user/checkoutController.js';

const router = express.Router();

router.get('/checkout', requireAuth('user'), loadCheckout);
router.post('/checkout/place-order', requireAuth('user'), placeOrder);
router.post('/checkout/direct-start', requireAuth('user'), startDirectCheckout);
router.get('/checkout/success/:id', requireAuth('user'), loadSuccess);

export default router;
