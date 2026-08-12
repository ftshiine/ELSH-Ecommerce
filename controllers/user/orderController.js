import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Wallet from '../../models/Wallet.js';
import { generateInvoicePDF } from '../../utils/pdfGenerator.js';

export const getOrders = async (req, res) => {
  try {
    const statusTab = req.query.tab || 'all';
    const searchQuery = req.query.search || '';
    
    let query = { user: req.session.user.id };
    
    if (statusTab === 'in-progress') {
      query.orderStatus = { $in: ['PENDING', 'PROCESSING', 'SHIPPED'] };
    } else if (statusTab === 'delivered') {
      query.orderStatus = 'DELIVERED';
    } else if (statusTab === 'cancelled') {
      query.orderStatus = 'CANCELLED';
    }
    
    if (searchQuery) {
      query.$or = [
        { orderId: { $regex: searchQuery, $options: 'i' } },
        { 'items.productName': { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    const orders = await Order.find(query).sort({ createdAt: -1 });

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
    res.status(500).send('Server Error');
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      user: req.session.user.id 
    });

    if (!order) {
      return res.status(404).render('user/404', { title: 'Order Not Found' });
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
    res.status(500).send('Server Error');
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;


    const order = await Order.findOne({ _id: req.params.id, user: req.session.user.id });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['PENDING', 'PROCESSING'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    order.orderStatus = 'CANCELLED';
    if (reason && reason.trim() !== '') {
      order.notes = order.notes ? order.notes + '\nCancel Reason: ' + reason : 'Cancel Reason: ' + reason;
    }
    
    // Process Refund to Wallet if PAID
    if (['Razorpay', 'Wallet'].includes(order.paymentInfo.method) && order.paymentInfo.status === 'PAID') {
      let wallet = await Wallet.findOne({ user: req.session.user.id });
      if (!wallet) {
        wallet = new Wallet({ user: req.session.user.id, balance: 0, totalRefunds: 0, transactions: [] });
      }
      wallet.balance += order.pricing.totalAmount;
      wallet.totalRefunds += order.pricing.totalAmount;
      wallet.transactions.push({
        amount: order.pricing.totalAmount,
        type: 'CREDIT',
        description: `Refund for cancelled Order #${order.orderId}`
      });
      await wallet.save();
      order.paymentInfo.status = 'REFUNDED';
    }
    
    // Restock items
    for (const item of order.items) {
      if (item.itemStatus !== 'CANCELLED') {
        item.itemStatus = 'CANCELLED';
        await Product.updateOne(
          { _id: item.product, 'variants._id': item.variant },
          { $inc: { 'variants.$.stock': item.quantity } }
        );
      }
    }
    
    await order.save();
    
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const cancelOrderItem = async (req, res) => {
  try {
    const { reason } = req.body;
    const { orderId, itemId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: req.session.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['PENDING', 'PROCESSING'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: 'Order cannot be partially cancelled at this stage' });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    if (item.itemStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Item is already cancelled' });
    }

    // Cancel the item
    item.itemStatus = 'CANCELLED';
    if (reason && reason.trim() !== '') {
      item.cancellationReason = reason;
    }

    // Process partial refund if PAID
    if (['Razorpay', 'Wallet'].includes(order.paymentInfo.method) && order.paymentInfo.status === 'PAID') {
      let wallet = await Wallet.findOne({ user: req.session.user.id });
      if (!wallet) {
        wallet = new Wallet({ user: req.session.user.id, balance: 0, totalRefunds: 0, transactions: [] });
      }
      
      // We refund the specific item's total
      const refundAmount = item.itemTotal;
      wallet.balance += refundAmount;
      wallet.totalRefunds += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: 'CREDIT',
        description: `Refund for cancelled item in Order #${order.orderId}`
      });
      await wallet.save();
    }

    // Restock the specific item
    await Product.updateOne(
      { _id: item.product, 'variants._id': item.variant },
      { $inc: { 'variants.$.stock': item.quantity } }
    );

    // Check if ALL items in the order are now cancelled
    const allCancelled = order.items.every(i => i.itemStatus === 'CANCELLED');
    if (allCancelled) {
      order.orderStatus = 'CANCELLED';
      if (order.paymentInfo.status === 'PAID') {
          // If all items are cancelled, we've refunded them all piece-meal, or if not piece-meal, we mark order REFUNDED
          order.paymentInfo.status = 'REFUNDED';
      }
    }

    await order.save();
    res.json({ success: true, message: 'Item cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order item:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const returnOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Return reason is required' });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.session.user.id });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
    }

    order.orderStatus = 'RETURN_REQUESTED';
    order.notes = order.notes ? order.notes + '\nReturn Reason: ' + reason : 'Return Reason: ' + reason;
    
    await order.save();
    
    res.json({ success: true, message: 'Return request submitted successfully' });
  } catch (error) {
    console.error('Error returning order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.session.user.id })
      .populate('items.product');

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
