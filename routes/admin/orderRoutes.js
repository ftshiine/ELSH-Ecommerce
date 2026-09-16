import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { getOrders, getOrderDetails, getReturnRequests, rejectReturn, updateOrderStatus, processRefund, downloadInvoice } from '../../controllers/admin/orderController.js';

const router = express.Router();

router.get('/orders', requireAuth('admin'), getOrders);
router.get('/orders/returns', requireAuth('admin'), getReturnRequests);
router.get('/orders/:id', requireAuth('admin'), getOrderDetails);
router.patch('/orders/:id/status', requireAuth('admin'), updateOrderStatus);
router.post('/orders/:id/refund', requireAuth('admin'), processRefund);
router.post('/orders/:id/reject-return', requireAuth('admin'), rejectReturn);
router.get('/orders/:id/invoice', requireAuth('admin'), downloadInvoice);

export default router;
