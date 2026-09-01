import * as orderService from '../../services/admin/orderService.js';
import { generateInvoicePDF } from '../../utils/pdfGenerator.js';
import { STATUS_CODES, COMMON_MESSAGES, ORDER_MESSAGES } from '../../constants/index.js';

export const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const status = req.query.status;
    const search = req.query.search;
    const dateFilter = req.query.date || 'Last 30 Days';

    const {
      orders,
      totalPages,
      totalOrdersCount,
      allOrdersCount,
      pendingFulfillmentCount,
      outForDeliveryCount,
      monthlyRevenue
    } = await orderService.getOrdersAdmin({ page, limit, status, search, dateFilter });

    res.render('admin/order/index', {
      orders,
      currentPage: page,
      totalPages,
      totalOrdersCount,
      allOrdersCount,
      pendingFulfillmentCount,
      outForDeliveryCount,
      monthlyRevenue,
      currentStatusFilter: req.query.status || 'All Status',
      currentDateFilter: dateFilter,
      searchQuery: search || '',
      title: 'Orders',
      activePage: 'orders'
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderDetails = async (req, res, next) => {
  try {
    const order = await orderService.getOrderDetailsAdmin(req.params.id);

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).render('admin/404', { title: ORDER_MESSAGES.NOT_FOUND, activePage: 'orders' });
    }

    res.render('admin/order/details', {
      order,
      title: `Order #${order.orderId}`,
      activePage: 'orders'
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await orderService.updateOrderStatusAdmin(req.params.id, status);

    res.status(STATUS_CODES.OK).json({ success: true, message: ORDER_MESSAGES.STATUS_UPDATED });
  } catch (error) {
    console.error('Error updating order status:', error);
    const statusCode = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({ success: false, message: error.message || ORDER_MESSAGES.STATUS_UPDATE_FAILED });
  }
};

export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    await orderService.processRefundAdmin(id);

    res.status(STATUS_CODES.OK).json({ success: true, message: ORDER_MESSAGES.REFUND_SUCCESS });
  } catch (error) {
    console.error('Error processing refund:', error);
    const statusCode = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({ success: false, message: error.message || ORDER_MESSAGES.REFUND_FAILED });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const order = await orderService.getOrderWithProductsAdmin(req.params.id);

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
