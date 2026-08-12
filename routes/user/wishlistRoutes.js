import express from 'express';
import { getWishlist, toggleWishlist, removeFromWishlist } from '../../controllers/user/wishlistController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', requireAuth('user'), getWishlist);
router.post('/toggle', requireAuth('user'), toggleWishlist);
router.delete('/:productId', requireAuth('user'), removeFromWishlist);

export default router;
