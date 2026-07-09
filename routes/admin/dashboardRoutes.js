import express from 'express';
import { loadDashboard } from '../../controllers/admin/dashboardController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', requireAuth('admin'), loadDashboard);

export default router;