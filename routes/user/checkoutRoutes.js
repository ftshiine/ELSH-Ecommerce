import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { loadCheckout, placeOrder, loadSuccess, loadFailure, startDirectCheckout, verifyPayment, applyCheckoutCoupon, removeCheckoutCoupon } from '../../controllers/user/checkoutController.js';

const router = express.Router();

router.get('/checkout', requireAuth('user'), loadCheckout);
router.post('/checkout/place-order', requireAuth('user'), placeOrder);
router.post('/checkout/direct-start', requireAuth('user'), startDirectCheckout);
router.post('/checkout/verify-payment', requireAuth('user'), verifyPayment);
router.get('/checkout/success/:id', requireAuth('user'), loadSuccess);
router.post('/checkout/apply-coupon', requireAuth('user'), applyCheckoutCoupon);
router.get('/checkout/failure/:id', requireAuth('user'), loadFailure);
router.delete('/checkout/remove-coupon', requireAuth('user'), removeCheckoutCoupon);
export default router;
