import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Wallet from '../../models/Wallet.js';
import Coupon from '../../models/Coupon.js';
import Razorpay from 'razorpay';
import { STATUS_CODES } from '../../constants/index.js';

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const getUserOrders = async ({ userId, statusTab = 'all', searchQuery = '' }) => {
    let query = { user: userId };

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

    return await Order.find(query).sort({ createdAt: -1 });
};

export const getUserOrderById = async (orderId, userId) => {
    return await Order.findOne({ _id: orderId, user: userId });
};

export const getUserOrderWithProducts = async (orderId, userId) => {
    return await Order.findOne({ _id: orderId, user: userId }).populate('items.product');
};

export const cancelUserOrder = async ({ orderId, userId, reason }) => {
    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }


    if (!['PENDING', 'PROCESSING'].includes(order.orderStatus)) {
        const error = new Error('Order cannot be cancelled at this stage');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
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
        refundAmount = order.paymentInfo.walletAmountUsed;
    }

    if (refundAmount > 0) {
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            wallet = new Wallet({ user: userId, balance: 0, totalRefunds: 0, transactions: [] });
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
            coupon.usedBy = coupon.usedBy.filter(id => id.toString() !== userId.toString());
            await coupon.save();
        }
    }

    return await order.save();
};

export const cancelUserOrderItem = async ({ orderId, itemId, userId, reason }) => {
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (!['PENDING', 'PROCESSING'].includes(order.orderStatus)) {
        const error = new Error('Order cannot be partially cancelled at this stage');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const item = order.items.id(itemId);
    if (!item) {
        const error = new Error('Item not found in order');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (item.itemStatus === 'CANCELLED') {
        const error = new Error('Item is already cancelled');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    item.itemStatus = 'CANCELLED';
    if (reason && reason.trim() !== '') {
        item.cancellationReason = reason;
    }

    let refundAmount = 0;
    if (['Razorpay', 'Wallet', 'Wallet + Razorpay'].includes(order.paymentInfo.method) && order.paymentInfo.status === 'PAID') {
        let itemRefund = item.itemTotal;

        // Deduct this item's proportional share of the coupon discount
        if (order.pricing.discount && order.pricing.discount > 0 && order.pricing.subtotal > 0) {
            const itemFraction = item.itemTotal / order.pricing.subtotal;
            const itemDiscount = order.pricing.discount * itemFraction;
            itemRefund = Math.max(0, item.itemTotal - itemDiscount);
        }

        refundAmount = Math.round(itemRefund * 100) / 100;

    } else if (order.paymentInfo.walletAmountUsed && order.paymentInfo.walletAmountUsed > 0) {
        refundAmount = Math.min(item.itemTotal, order.paymentInfo.walletAmountUsed);
        order.paymentInfo.walletAmountUsed -= refundAmount;
    }

    if (refundAmount > 0) {
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            wallet = new Wallet({ user: userId, balance: 0, totalRefunds: 0, transactions: [] });
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

    await Product.updateOne(
        { _id: item.product, 'variants._id': item.variant },
        { $inc: { 'variants.$.stock': item.quantity } }
    );

    const allCancelled = order.items.every(i => i.itemStatus === 'CANCELLED');
    if (allCancelled) {
        order.orderStatus = 'CANCELLED';
        if (order.paymentInfo.status === 'PAID') {
            order.paymentInfo.status = 'REFUNDED';
        }
    }

    return await order.save();
};

export const requestOrderReturn = async ({ orderId, userId, reason }) => {
    if (!reason) {
        const error = new Error('Return reason is required');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (order.orderStatus !== 'DELIVERED') {
        const error = new Error('Only delivered orders can be returned');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    order.orderStatus = 'RETURN_REQUESTED';
    order.notes = order.notes ? order.notes + '\nReturn Reason: ' + reason : 'Return Reason: ' + reason;

    return await order.save();
};

export const requestOrderItemReturn = async ({ orderId, itemId, userId, reason }) => {
    if (!reason) {
        const error = new Error('Return reason is required');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (order.orderStatus !== 'DELIVERED') {
        const error = new Error('Only delivered orders are eligible for returns');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const item = order.items.id(itemId);
    if (!item) {
        const error = new Error('Item not found in order');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (['CANCELLED', 'RETURNED', 'RETURN_REQUESTED'].includes(item.itemStatus)) {
        const error = new Error('Item is not eligible for return');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (item.returnWindowDays === 0) {
        const error = new Error('This item is non-returnable');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (order.deliveredAt) {
        const deliveredDate = new Date(order.deliveredAt);
        const expiryDate = new Date(deliveredDate.getTime() + item.returnWindowDays * 24 * 60 * 60 * 1000);
        if (new Date() > expiryDate) {
            const error = new Error('Return window has expired for this item');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
    }

    item.itemStatus = 'RETURN_REQUESTED';
    order.notes = order.notes ? order.notes + `\nItem Return Reason (${item.productName}): ` + reason : `Item Return Reason (${item.productName}): ` + reason;

    if (order.orderStatus === 'DELIVERED') {
        order.orderStatus = 'RETURN_REQUESTED';
    }

    return await order.save();
};

export const initiatePaymentRetry = async (orderId, userId) => {
    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (order.paymentInfo.status === 'PAID') {
        const error = new Error('Order is already paid');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (order.orderStatus === 'CANCELLED') {
        const error = new Error('Cannot pay for a cancelled order');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const options = {
        amount: Math.round(order.pricing.totalAmount * 100),
        currency: 'INR',
        receipt: order._id.toString()
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    return {
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        key: process.env.RAZORPAY_KEY_ID,
        amount: options.amount
    };
};
