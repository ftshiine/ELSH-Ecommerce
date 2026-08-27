import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Wallet from '../../models/Wallet.js';
import Coupon from '../../models/Coupon.js';
import { generateInvoicePDF } from '../../utils/pdfGenerator.js';
import Razorpay from 'razorpay';

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
    } else if (statusTab === 'returns') {
      query.orderStatus = { $in: ['RETURN_REQUESTED', 'RETURNED'] };
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

    // Process Refund to Wallet
    let refundAmount = 0;
    
    if (['Razorpay', 'Wallet', 'Wallet + Razorpay'].includes(order.paymentInfo.method) && order.paymentInfo.status === 'PAID') {
      refundAmount = order.pricing.totalAmount;
    } else if (order.paymentInfo.walletAmountUsed && order.paymentInfo.walletAmountUsed > 0) {
      // Order is PENDING but wallet was partially used and deducted
      refundAmount = order.paymentInfo.walletAmountUsed;
    }

    if (refundAmount > 0) {
      let wallet = await Wallet.findOne({ user: req.session.user.id });
      if (!wallet) {
        wallet = new Wallet({ user: req.session.user.id, balance: 0, totalRefunds: 0, transactions: [] });
      }
      wallet.balance += refundAmount;
      wallet.totalRefunds += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
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

    if (order.pricing && order.pricing.couponCode) {
      const coupon = await Coupon.findOne({ code: order.pricing.couponCode });
      if (coupon && coupon.restoreOnCancel) {
        if (coupon.usedCount > 0) coupon.usedCount -= 1;
        coupon.usedBy = coupon.usedBy.filter(id => id.toString() !== req.session.user.id.toString());
        await coupon.save();
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

    // Process partial refund 
    let refundAmount = 0;
    if (['Razorpay', 'Wallet', 'Wallet + Razorpay'].includes(order.paymentInfo.method) && order.paymentInfo.status === 'PAID') {
      refundAmount = item.itemTotal;
    } else if (order.paymentInfo.walletAmountUsed && order.paymentInfo.walletAmountUsed > 0) {
      refundAmount = Math.min(item.itemTotal, order.paymentInfo.walletAmountUsed);
      order.paymentInfo.walletAmountUsed -= refundAmount; // Reduce available wallet refund pool
    }

    if (refundAmount > 0) {
      let wallet = await Wallet.findOne({ user: req.session.user.id });
      if (!wallet) {
        wallet = new Wallet({ user: req.session.user.id, balance: 0, totalRefunds: 0, transactions: [] });
      }

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

export const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Return reason is required' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.session.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Only delivered orders are eligible for returns' });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    if (['CANCELLED', 'RETURNED', 'RETURN_REQUESTED'].includes(item.itemStatus)) {
      return res.status(400).json({ success: false, message: 'Item is not eligible for return' });
    }

    if (item.returnWindowDays === 0) {
      return res.status(400).json({ success: false, message: 'This item is non-returnable' });
    }

    if (order.deliveredAt) {
      const deliveredDate = new Date(order.deliveredAt);
      const expiryDate = new Date(deliveredDate.getTime() + item.returnWindowDays * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        return res.status(400).json({ success: false, message: 'Return window has expired for this item' });
      }
    }

    // Process the return request
    item.itemStatus = 'RETURN_REQUESTED';
    order.notes = order.notes ? order.notes + `\nItem Return Reason (${item.productName}): ` + reason : `Item Return Reason (${item.productName}): ` + reason;

    // Ensure the overall order reflects there's an active return request for admin review
    if (order.orderStatus === 'DELIVERED') {
      order.orderStatus = 'RETURN_REQUESTED';
    }

    await order.save();
    res.json({ success: true, message: 'Return request submitted successfully' });

  } catch (error) {
    console.error('Error returning order item:', error);
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

export const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findOne({ _id: orderId, user: req.session.user.id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentInfo.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    if (order.orderStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled order' });
    }

    const options = {
      amount: Math.round(order.pricing.totalAmount * 100),
      currency: 'INR',
      receipt: order._id.toString()
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);
    
    res.json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      key: process.env.RAZORPAY_KEY_ID,
      amount: options.amount
    });
  } catch (error) {
    console.error('Retry payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment retry.' });
  }
};
