import Order from '../../models/Order.js';
import * as orderService from '../../services/user/orderService.js';
import { generateInvoicePDF } from '../../utils/pdfGenerator.js';
import { STATUS_CODES, COMMON_MESSAGES, ORDER_MESSAGES } from '../../constants/index.js';

export const getOrders = async (req, res) => {
  try {
    const statusTab = req.query.tab || 'all';
    const searchQuery = req.query.search || '';
    const userId = req.session.user.id;

    const orders = await orderService.getUserOrders({ userId, statusTab, searchQuery });

    res.render('user/order/list', {
      title: 'My Orders',
      orders,
      activeTab: statusTab,
      searchQuery,
      breadcrumbs: [
        { name: 'Home', url: '/home' },
        { name: 'My Orders', url: '/orders' }
      ]
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.SERVER_ERROR);
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const order = await orderService.getUserOrderById(req.params.id, req.session.user.id);

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).render('user/404', { title: ORDER_MESSAGES.NOT_FOUND });
    }

    res.render('user/order/detail', {
      title: 'Order Details',
      order,
      breadcrumbs: [
        { name: 'Home', url: '/home' },
        { name: 'My Orders', url: '/orders' },
        { name: `Order #${order.orderId}`, url: `/orders/${order._id}` }
      ]
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.SERVER_ERROR);
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const orderId = req.params.id;
    const userId = req.session.user.id;

    if (!reason || reason.trim().length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Cancellation reason is required'
      })
    }


    await orderService.cancelUserOrder({ orderId, userId, reason });

    res.status(STATUS_CODES.OK).json({ success: true, message: ORDER_MESSAGES.CANCEL_SUCCESS });
  } catch (error) {
    console.error('Error cancelling order:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.SERVER_ERROR });
  }
};

export const cancelOrderItem = async (req, res) => {
  try {
    const { reason } = req.body;
    const { orderId, itemId } = req.params;
    const userId = req.session.user.id;

    if (!reason || reason.trim().length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Cancellation reason is required'
      })
    }

    await orderService.cancelUserOrderItem({ orderId, itemId, userId, reason });

    res.status(STATUS_CODES.OK).json({ success: true, message: ORDER_MESSAGES.ITEM_CANCEL_SUCCESS });
  } catch (error) {
    console.error('Error cancelling order item:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.SERVER_ERROR });
  }
};

export const returnOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const orderId = req.params.id;
    const userId = req.session.user.id;

    await orderService.requestOrderReturn({ orderId, userId, reason });

    res.status(STATUS_CODES.OK).json({ success: true, message: ORDER_MESSAGES.RETURN_SUCCESS });
  } catch (error) {
    console.error('Error returning order:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.SERVER_ERROR });
  }
};

export const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user.id;

    await orderService.requestOrderItemReturn({ orderId, itemId, userId, reason });

    res.status(STATUS_CODES.OK).json({ success: true, message: ORDER_MESSAGES.RETURN_SUCCESS });
  } catch (error) {
    console.error('Error returning order item:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.SERVER_ERROR });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const order = await orderService.getUserOrderWithProducts(req.params.id, req.session.user.id);

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).send(ORDER_MESSAGES.NOT_FOUND);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId || order._id}.pdf`);

    generateInvoicePDF(order, res);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(ORDER_MESSAGES.INVOICE_ERROR);
  }
};

export const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user.id;

    const result = await orderService.initiatePaymentRetry(orderId, userId);

    res.status(STATUS_CODES.OK).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Retry payment error:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || ORDER_MESSAGES.PAYMENT_RETRY_FAILED });
  }
};
