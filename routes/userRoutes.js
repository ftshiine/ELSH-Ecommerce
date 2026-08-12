import express from 'express';
import { preventCache } from '../middleware/authMiddleware.js';
import { formStateMiddleware } from '../middleware/formMiddleware.js';
import { setLocals } from '../middleware/localsMiddleware.js';

import landingRoutes from './user/landingRoutes.js';
import userAuthRoutes from './user/authRoutes.js';
import homeRoutes from './user/homeRoutes.js';
import profileRoutes from './user/profileRoutes.js';
import addressRoutes from './user/addressRoutes.js';
import shopRoutes from './user/shopRoutes.js';
import cartRoutes from './user/cartRoutes.js';
import orderRoutes from './user/orderRoutes.js';
import checkoutRoutes from './user/checkoutRoutes.js';
import walletRoutes from './user/walletRoutes.js';
import wishlistRoutes from './user/wishlistRoutes.js';

const router = express.Router();

// Apply common middlewares to all user routes
router.use(preventCache);
router.use(formStateMiddleware);
router.use(setLocals);

// Mount individual route modules
router.use('/', landingRoutes);
router.use('/', userAuthRoutes);
router.use('/', homeRoutes);
router.use('/', profileRoutes);
router.use('/', addressRoutes);
router.use('/', shopRoutes);
router.use('/', cartRoutes);
router.use('/', orderRoutes);
router.use('/', checkoutRoutes);
router.use('/', walletRoutes);
router.use('/wishlist', wishlistRoutes);

export default router;
