import express from 'express';
import { loadSalesReport, downloadPdf, downloadExcel } from '../../controllers/admin/salesReportController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/sales-report', requireAuth('admin'), loadSalesReport);
router.get('/sales-report/export/pdf', requireAuth('admin'), downloadPdf);
router.get('/sales-report/export/excel', requireAuth('admin'), downloadExcel);

export default router;
