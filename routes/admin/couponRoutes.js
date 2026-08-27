import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  loadCoupons,
  loadCreateCoupon,
  createCoupon,
  toggleCouponStatus
} from '../../controllers/admin/couponController.js';

const router = express.Router();

// All routes are protected by admin auth middleware mapped in adminRoutes.js
router.get('/coupons', requireAuth('admin'), loadCoupons);
router.get('/coupons/create', requireAuth('admin'), loadCreateCoupon);
router.post('/coupons', requireAuth('admin'), createCoupon);
router.patch('/coupons/:id/toggle', requireAuth('admin'), toggleCouponStatus);

export default router;
