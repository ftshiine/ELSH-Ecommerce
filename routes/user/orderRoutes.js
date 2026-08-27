import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { getOrders, getOrderDetails, cancelOrder, cancelOrderItem, returnOrder, returnOrderItem, downloadInvoice, retryPayment } from '../../controllers/user/orderController.js';

const router = express.Router();

// Order list and detail
router.get('/orders', requireAuth('user'), getOrders);
router.get('/orders/:id', requireAuth('user'), getOrderDetails);

// Order actions
router.post('/orders/:id/cancel', requireAuth('user'), cancelOrder);
router.post('/orders/:orderId/cancel-item/:itemId', requireAuth('user'), cancelOrderItem);
router.post('/orders/:id/return', requireAuth('user'), returnOrder);
router.post('/orders/:orderId/return-item/:itemId', requireAuth('user'), returnOrderItem);
router.post('/orders/:id/retry-payment', requireAuth('user'), retryPayment);
router.get('/orders/:id/invoice', requireAuth('user'), downloadInvoice);

export default router;
