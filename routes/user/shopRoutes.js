import express from 'express';
import { loadShop, loadProductDetails, submitReview, deleteReview } from '../../controllers/user/shopController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/shop', requireAuth('user'), loadShop);
router.get('/product/:id', requireAuth('user'), loadProductDetails);
router.post('/product/:id/review', requireAuth('user'), submitReview);
router.delete('/product/:productId/review/:reviewId', requireAuth('user'), deleteReview);

export default router;
