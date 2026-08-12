import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Wallet from '../../models/Wallet.js';
import { generateInvoicePDF } from '../../utils/pdfGenerator.js';

export const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Filters
    const query = {};
    if (req.query.status && req.query.status !== 'All Status') {
      query.orderStatus = req.query.status.toUpperCase();
    }

    // Search by Order ID, Customer Name, Email, or Phone
    const search = req.query.search ? req.query.search.trim() : '';
    if (search) {

      const mongoose = await import('mongoose');
      const User = (await import('../../models/User.js')).default;

      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = matchingUsers.map(u => u._id);

      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { user: { $in: userIds } }
      ];
    }

    // Date filter
    const dateFilter = req.query.date || 'Last 30 Days';
    if (dateFilter && dateFilter !== 'All Time') {
      const now = new Date();
      let startDate;
      if (dateFilter === 'Last 7 Days') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'Last 30 Days') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'This Year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Sort by latest
    const sort = { createdAt: -1 };

    // Fetch orders with pagination
    const orders = await Order.find(query)
      .populate('user', 'fullName email profileImage phone createdAt totalSpend')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalOrdersCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrdersCount / limit);

    // Calculate stats for top cards
    const allOrdersCount = await Order.countDocuments();
    const pendingFulfillmentCount = await Order.countDocuments({ orderStatus: { $in: ['PENDING', 'PROCESSING'] } });
    const outForDeliveryCount = await Order.countDocuments({ orderStatus: 'SHIPPED' });

    // Calculate Monthly Revenue 
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenueStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          orderStatus: { $ne: 'CANCELLED' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    const monthlyRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;

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
      searchQuery: search,
      title: 'Orders',
      activePage: 'orders'
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullName email createdAt totalSpend');

    if (!order) {
      return res.status(404).render('admin/404', { title: 'Order Not Found', activePage: 'orders' });
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
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = status;

    // Restock if cancelled or returned 
    if ((status === 'CANCELLED' || status === 'RETURNED') &&
      (previousStatus !== 'CANCELLED' && previousStatus !== 'RETURNED')) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product, 'variants._id': item.variant },
          { $inc: { 'variants.$.stock': item.quantity } }
        );
      }
    }

    // Automatically update payment status for COD if delivered
    if (status === 'DELIVERED' && order.paymentInfo.method === 'COD') {
      order.paymentInfo.status = 'PAID';
    }

    await order.save();

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('items.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'RETURN_REQUESTED' && order.orderStatus !== 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Order is not eligible for refund.' });
    }

    if (order.paymentInfo.status === 'REFUNDED') {
      return res.status(400).json({ success: false, message: 'Order is already refunded.' });
    }

    // Find or create wallet for user
    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = new Wallet({ user: order.user, balance: 0, totalRefunds: 0, transactions: [] });
    }

    const refundAmount = order.pricing.totalAmount;

    // Credit Wallet
    wallet.balance += refundAmount;
    wallet.totalRefunds += refundAmount;
    wallet.transactions.push({
      amount: refundAmount,
      type: 'CREDIT',
      description: `Refund for Order #${order.orderId}`
    });

    await wallet.save();

    // Update Order Status and Restock Items if not already cancelled
    order.paymentInfo.status = 'REFUNDED';

    if (order.orderStatus === 'RETURN_REQUESTED') {
      order.orderStatus = 'RETURNED';

      // Restock Items atomically
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product._id, 'variants._id': item.variant },
          { $inc: { 'variants.$.stock': item.quantity } }
        );
      }
    }

    await order.save();

    res.json({ success: true, message: 'Refund processed successfully and amount credited to Wallet.' });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund.' });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId || order._id}.pdf`);

    generateInvoicePDF(order, res);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Error generating invoice');
  }
};
