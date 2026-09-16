import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import ExcelJS from 'exceljs';

export const getDashboardMetrics = async () => {
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'user' });

    // Revenue & Orders
    const orders = await Order.find({ orderStatus: { $nin: ['CANCELLED', 'RETURNED'] } });
    let totalRevenue = 0;
    orders.forEach(order => {
        totalRevenue += order.pricing.totalAmount;
    });
    const totalOrders = orders.length;

    // Active Coupons
    const activeCoupons = await Coupon.countDocuments({ isActive: true });

    // Pending Orders
    const pendingOrders = await Order.countDocuments({ orderStatus: 'PENDING' });

    // Performance & Deductions Metrics
    const allOrders = await Order.find();
    const totalAllOrders = allOrders.length;
    let totalCancellations = 0;
    let totalReturns = 0;
    let totalDiscounts = 0;
    let grossRevenue = 0;

    allOrders.forEach(order => {
        if (order.orderStatus === 'CANCELLED') {
            totalCancellations++;
        } else if (order.orderStatus === 'RETURNED') {
            totalReturns++;
        } else {
            // Count partial cancellations/returns
            if (order.items.some(item => item.itemStatus === 'CANCELLED')) totalCancellations++;
            if (order.items.some(item => item.itemStatus === 'RETURNED')) totalReturns++;
            
            totalDiscounts += order.pricing.discount || 0;
            grossRevenue += (order.pricing.totalAmount + (order.pricing.discount || 0));
        }
    });
    
    let deductionRate = 0;
    if (grossRevenue > 0) {
        deductionRate = ((totalDiscounts / grossRevenue) * 100).toFixed(1);
    }
    
    let cancellationRate = 0;
    let returnRate = 0;
    if (totalAllOrders > 0) {
        cancellationRate = ((totalCancellations / totalAllOrders) * 100).toFixed(1);
        returnRate = ((totalReturns / totalAllOrders) * 100).toFixed(1);
    }

    // Monthly Sales
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    let monthlySales = 0;
    monthlyOrders.forEach(order => {
        monthlySales += order.pricing.totalAmount;
    });

    // Top 10 Best Selling Products
    const topProducts = await Order.aggregate([
        { $match: { orderStatus: { $nin: ['CANCELLED', 'RETURNED'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
        { $unwind: '$productInfo' },
        {
            $project: {
                _id: 1,
                totalSold: 1,
                name: '$productInfo.name',
                image: { $arrayElemAt: [{ $arrayElemAt: ['$productInfo.variants.images', 0] }, 0] }
            }
        }
    ]);

    // Top 10 Best Selling Categories
    const topCategories = await Order.aggregate([
        { $match: { orderStatus: { $nin: ['CANCELLED', 'RETURNED'] } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
        { $unwind: '$productInfo' },
        { $group: { _id: '$productInfo.category', totalSold: { $sum: '$items.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryInfo' } },
        { $unwind: '$categoryInfo' },
        {
            $project: {
                _id: 1,
                totalSold: 1,
                name: '$categoryInfo.name'
            }
        }
    ]);

    // Top 10 Best Selling Brands
    const topBrands = await Order.aggregate([
        { $match: { orderStatus: { $nin: ['CANCELLED', 'RETURNED'] } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
        { $unwind: '$productInfo' },
        { $group: { _id: '$productInfo.brand', totalSold: { $sum: '$items.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ]);

    // Fetch Low Stock Items 
    const productsWithLowStock = await Product.find({
        'variants.stock': { $gt: 0, $lte: 10 }
    });

    let lowStockItems = [];
    productsWithLowStock.forEach(product => {
        product.variants.forEach(variant => {
            if (variant.stock > 0 && variant.stock <= 10) {
                lowStockItems.push({
                    productId: product._id,
                    variantId: variant._id,
                    productName: product.name,
                    variantName: variant.size,
                    image: variant.images && variant.images.length > 0 ? variant.images[0].replace(/^public[\\/]/, '/') : '/images/placeholder.jpg',
                    stock: variant.stock
                });
            }
        });
    });

    return {
        totalProducts,
        totalCustomers,
        totalRevenue,
        totalOrders,
        activeCoupons,
        pendingOrders,
        monthlySales,
        topProducts,
        topCategories,
        topBrands,
        lowStockItems,
        totalCancellations,
        cancellationRate,
        totalReturns,
        returnRate,
        totalDiscounts,
        deductionRate
    };
};

export const getDashboardChartData = async (filter = 'monthly') => {
    const matchStage = { $match: { orderStatus: { $nin: ['CANCELLED', 'RETURNED'] } } };

    let groupByFormat;
    let limit;

    if (filter === 'yearly') {
        groupByFormat = "%Y";
        limit = 5;
    } else if (filter === 'monthly') {
        groupByFormat = "%Y-%m";
        limit = 12;
    } else if (filter === 'last30') {
        groupByFormat = "%Y-%m-%d";
        limit = 30;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        matchStage.$match.createdAt = { $gte: thirtyDaysAgo };
    }

    return await Order.aggregate([
        matchStage,
        {
            $group: {
                _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
                revenue: { $sum: "$pricing.totalAmount" }
            }
        },
        { $sort: { _id: 1 } },
        { $limit: limit }
    ]);
};

export const generateLedgerExcelWorkbook = async (stream) => {
    const orders = await Order.find().populate('user', 'fullName').sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ledger Book');

    worksheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Transaction Type', key: 'type', width: 20 },
        { header: 'Debit (Rs)', key: 'debit', width: 15 },
        { header: 'Credit (Rs)', key: 'credit', width: 15 },
        { header: 'Balance (Rs)', key: 'balance', width: 15 }
    ];

    let currentBalance = 0;
    const ascendingOrders = [...orders].reverse();

    ascendingOrders.forEach(order => {
        let debit = 0;
        let credit = 0;
        let type = 'Sale';

        if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'RETURNED') {
            type = 'Refund/Cancelled';
            debit = order.pricing.totalAmount;
        } else {
            credit = order.pricing.totalAmount;
        }

        currentBalance = currentBalance + credit - debit;

        worksheet.addRow({
            date: new Date(order.createdAt).toLocaleDateString(),
            orderId: order.orderId,
            customer: order.user ? order.user.fullName : 'Guest',
            type: type,
            debit: debit > 0 ? debit : '-',
            credit: credit > 0 ? credit : '-',
            balance: currentBalance
        });
    });

    await workbook.xlsx.write(stream);
    stream.end();
};
