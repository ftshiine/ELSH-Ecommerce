import express from 'express';
import { preventCache } from '../middleware/authMiddleware.js';
import { formStateMiddleware } from '../middleware/formMiddleware.js';
import { setLocals } from '../middleware/localsMiddleware.js';

import adminAuthRoutes from './admin/authRoutes.js';
import dashboardRoutes from './admin/dashboardRoutes.js';
import userRoutes from './admin/userRoutes.js';
import categoryRoutes from './admin/categoryRoutes.js';
import productRoutes from './admin/productRoutes.js';
import orderRoutes from './admin/orderRoutes.js';
import inventoryRoutes from './admin/inventoryRoutes.js';
import couponRoutes from './admin/couponRoutes.js';
import offerRoutes from './admin/offerRoutes.js';
import salesReportRoutes from './admin/salesReportRoutes.js';

const router = express.Router();

// Apply common middlewares to all admin routes
router.use(preventCache);
router.use(formStateMiddleware);
router.use(setLocals);

// Mount individual route modules
router.use('/', adminAuthRoutes);
router.use('/', dashboardRoutes);
router.use('/', userRoutes);
router.use('/', categoryRoutes);
router.use('/', productRoutes);
router.use('/', orderRoutes);
router.use('/', inventoryRoutes);
router.use('/', couponRoutes);
router.use('/', offerRoutes);
router.use('/', salesReportRoutes);

export default router;
