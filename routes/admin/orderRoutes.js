import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { getOrders, getOrderDetails, updateOrderStatus, processRefund, downloadInvoice } from '../../controllers/admin/orderController.js';

const router = express.Router();

router.get('/orders', requireAuth('admin'), getOrders);
router.get('/orders/:id', requireAuth('admin'), getOrderDetails);
router.patch('/orders/:id/status', requireAuth('admin'), updateOrderStatus);
router.post('/orders/:id/refund', requireAuth('admin'), processRefund);
router.get('/orders/:id/invoice', requireAuth('admin'), downloadInvoice);

export default router;
