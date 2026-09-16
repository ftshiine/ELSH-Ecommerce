import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { getSettings, updateSettings, setReferralCoupon } from '../../controllers/admin/settingsController.js';

const router = express.Router();

// Existing Routes
router.get('/settings', requireAuth('admin'), getSettings);
router.post('/settings', requireAuth('admin'), updateSettings);

// New Route for Full-Page Coupon Selection
router.get('/settings/set-coupon', requireAuth('admin'), setReferralCoupon);

export default router;
