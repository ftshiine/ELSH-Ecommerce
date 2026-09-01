import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Wallet from '../../models/Wallet.js';
import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import { STATUS_CODES } from '../../constants/index.js';

export const getOrdersAdmin = async ({ page = 1, limit = 5, status, search, dateFilter }) => {
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== 'All Status') {
        query.orderStatus = status.toUpperCase();
    }

    if (search && search.trim() !== '') {
        const searchTerm = search.trim();
        const matchingUsers = await User.find({
            $or: [
                { firstName: { $regex: searchTerm, $options: 'i' } },
                { lastName: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { phone: { $regex: searchTerm, $options: 'i' } }
            ]
        }).select('_id');

        const userIds = matchingUsers.map(u => u._id);

        query.$or = [
            { orderId: { $regex: searchTerm, $options: 'i' } },
            { user: { $in: userIds } }
        ];
    }

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

    const sort = { createdAt: -1 };

    const orders = await Order.find(query)
        .populate('user', 'fullName email profileImage phone createdAt totalSpend')
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const totalOrdersCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrdersCount / limit);

    const allOrdersCount = await Order.countDocuments();
    const pendingFulfillmentCount = await Order.countDocuments({ orderStatus: { $in: ['PENDING', 'PROCESSING'] } });
    const outForDeliveryCount = await Order.countDocuments({ orderStatus: 'SHIPPED' });

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

    return {
        orders,
        totalPages,
        totalOrdersCount,
        allOrdersCount,
        pendingFulfillmentCount,
        outForDeliveryCount,
        monthlyRevenue
    };
};

export const getOrderDetailsAdmin = async (id) => {
    return await Order.findById(id).populate('user', 'fullName email createdAt totalSpend');
};

export const getOrderWithProductsAdmin = async (id) => {
    return await Order.findById(id).populate('items.product');
};

export const updateOrderStatusAdmin = async (orderId, status) => {
    const order = await Order.findById(orderId);
    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'];
    if (!validStatuses.includes(status)) {
        const error = new Error('Invalid status');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const previousStatus = order.orderStatus;

    if (order.paymentInfo.status === 'PENDING' && ['Razorpay', 'Wallet + Razorpay'].includes(order.paymentInfo.method)) {
        if (status !== 'CANCELLED') {
            const error = new Error('Cannot update order status because the online payment is still pending.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
    }

    const progression = ['PENDING', 'PROCESSING', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED'];

    if (progression.includes(previousStatus) && progression.includes(status)) {
        if (progression.indexOf(status) < progression.indexOf(previousStatus)) {
            const error = new Error('Cannot move order status backwards.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
    }

    if (previousStatus === 'DELIVERED' && !['DELIVERED', 'RETURN_REQUESTED', 'RETURNED'].includes(status)) {
        const error = new Error('Cannot revert a delivered order to previous stages.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (previousStatus === 'CANCELLED' && status !== 'CANCELLED') {
        const error = new Error('Cannot change status of a cancelled order.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (previousStatus === 'RETURNED' && status !== 'RETURNED') {
        const error = new Error('Cannot change status of a returned order.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (status === 'RETURN_REQUESTED' && previousStatus !== 'RETURN_REQUESTED') {
        const error = new Error('Return requests must be initiated by the customer.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    order.orderStatus = status;

    if ((status === 'CANCELLED' || status === 'RETURNED') &&
        (previousStatus !== 'CANCELLED' && previousStatus !== 'RETURNED')) {
        for (const item of order.items) {
            await Product.updateOne(
                { _id: item.product, 'variants._id': item.variant },
                { $inc: { 'variants.$.stock': item.quantity } }
            );
        }

        if (status === 'CANCELLED' && order.pricing && order.pricing.couponCode) {
            const coupon = await Coupon.findOne({ code: order.pricing.couponCode });
            if (coupon && coupon.restoreOnCancel) {
                if (coupon.usedCount > 0) coupon.usedCount -= 1;
                coupon.usedBy = coupon.usedBy.filter(id => id.toString() !== order.user.toString());
                await coupon.save();
            }
        }
    }

    if (status === 'DELIVERED') {
        if (!order.deliveredAt) order.deliveredAt = new Date();
        if (order.paymentInfo.method === 'COD') {
            order.paymentInfo.status = 'PAID';
        }
    }

    return await order.save();
};

export const processRefundAdmin = async (id) => {
    const order = await Order.findById(id).populate('items.product');

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (order.orderStatus !== 'RETURN_REQUESTED' && order.orderStatus !== 'CANCELLED') {
        const error = new Error('Order is not eligible for refund.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (order.paymentInfo.status === 'REFUNDED') {
        const error = new Error('Order is already refunded.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
        wallet = new Wallet({ user: order.user, balance: 0, totalRefunds: 0, transactions: [] });
    }

    let refundAmount = 0;
    if (['Razorpay', 'Wallet', 'Wallet + Razorpay'].includes(order.paymentInfo.method) && order.paymentInfo.status === 'PAID') {
        refundAmount = order.pricing.totalAmount;
    } else if (order.paymentInfo.walletAmountUsed && order.paymentInfo.walletAmountUsed > 0) {
        refundAmount = order.paymentInfo.walletAmountUsed;
    }

    if (refundAmount > 0) {
        wallet.balance += refundAmount;
        wallet.totalRefunds += refundAmount;
        wallet.transactions.push({
            amount: refundAmount,
            type: 'CREDIT',
            description: `Refund for Order #${order.orderId}`
        });
        await wallet.save();
    }

    order.paymentInfo.status = 'REFUNDED';

    if (order.orderStatus === 'RETURN_REQUESTED') {
        order.orderStatus = 'RETURNED';

        for (const item of order.items) {
            await Product.updateOne(
                { _id: item.product._id, 'variants._id': item.variant },
                { $inc: { 'variants.$.stock': item.quantity } }
            );
        }
    }

    return await order.save();
};
