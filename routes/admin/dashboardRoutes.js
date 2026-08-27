import express from 'express';
import { loadDashboard, getChartData, downloadLedgerExcel } from '../../controllers/admin/dashboardController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', requireAuth('admin'), loadDashboard);
router.get('/dashboard/chart-data', requireAuth('admin'), getChartData);
router.get('/dashboard/ledger-book', requireAuth('admin'), downloadLedgerExcel);

export default router;