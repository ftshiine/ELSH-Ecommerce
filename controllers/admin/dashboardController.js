import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import ExcelJS from 'exceljs';

const loadDashboard = async (req, res) => {
  try {
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
      { $project: {
          _id: 1,
          totalSold: 1,
          name: '$productInfo.name',
          image: { $arrayElemAt: [{ $arrayElemAt: ['$productInfo.variants.images', 0] }, 0] }
      }}
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
      { $project: {
          _id: 1,
          totalSold: 1,
          name: '$categoryInfo.name'
      }}
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

    res.render('admin/dashboard/index', {
      admin: req.session.admin,
      activePage: 'dashboard',
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
      lowStockItems
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getChartData = async (req, res) => {
  try {
    const { filter = 'monthly' } = req.query;
    
    // Base match for valid orders
    const matchStage = { $match: { orderStatus: { $nin: ['CANCELLED', 'RETURNED'] } } };
    
    let groupByFormat;
    let limit;
    
    // Configure date grouping format
    if (filter === 'yearly') {
      groupByFormat = "%Y";
      limit = 5; // Last 5 years
    } else if (filter === 'monthly') {
      groupByFormat = "%Y-%m";
      limit = 12; // Last 12 months
    } else if (filter === 'last30') {
      groupByFormat = "%Y-%m-%d";
      limit = 30; // Last 30 days
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchStage.$match.createdAt = { $gte: thirtyDaysAgo };
    }
    
    const chartData = await Order.aggregate([
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
    
    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chart data' });
  }
};

const downloadLedgerExcel = async (req, res) => {
  try {
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
    
    // Sort ascending for accurate running balance
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'elsh_ledger_book.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Ledger Book:', error);
    res.status(500).send('Failed to generate Ledger Book');
  }
};

export { loadDashboard, getChartData, downloadLedgerExcel };