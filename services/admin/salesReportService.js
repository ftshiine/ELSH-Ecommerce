import Order from '../../models/Order.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

export const getDateRange = (range, customStart, customEnd) => {
    const end = new Date();
    const start = new Date();

    if (range === 'daily') {
        start.setHours(0, 0, 0, 0);
    } else if (range === 'weekly') {
        start.setDate(end.getDate() - 7);
    } else if (range === 'yearly') {
        start.setFullYear(end.getFullYear() - 1);
    } else if (range === 'custom' && customStart && customEnd) {
        return {
            start: new Date(customStart),
            end: new Date(customEnd + 'T23:59:59.999Z')
        };
    } else if (range === 'last30') {
        start.setDate(end.getDate() - 30);
    } else {
        start.setTime(0);
    }

    return { start, end };
};

export const getReportData = async (start, end) => {
    const query = {
        createdAt: { $gte: start, $lte: end },
        orderStatus: { $nin: ['CANCELLED', 'RETURNED'] }
    };

    const orders = await Order.find(query).populate('user', 'fullName email').sort({ createdAt: -1 });

    let totalRevenue = 0;
    let totalDiscounts = 0;
    let totalCouponDeductions = 0;

    orders.forEach(order => {
        totalRevenue += order.pricing.totalAmount;
        totalDiscounts += order.pricing.discountAmount || 0;
        totalCouponDeductions += order.pricing.couponDiscount || 0;
    });

    const totalOrdersCount = orders.length;
    const averageOrderValue = totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0;
    const overallDiscount = totalDiscounts + totalCouponDeductions;

    return {
        orders,
        summary: {
            totalRevenue,
            averageOrderValue,
            totalOrdersCount,
            totalDiscounts: overallDiscount
        }
    };
};

export const generatePdfDocument = ({ start, end, orders, summary }, stream) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(stream);

    doc.fontSize(20).text('ELSH - Sales Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Date Range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
    doc.text(`Total Revenue: Rs. ${summary.totalRevenue.toFixed(2)}`);
    doc.text(`Total Orders: ${summary.totalOrdersCount}`);
    doc.text(`Average Order Value: Rs. ${summary.averageOrderValue.toFixed(2)}`);
    doc.text(`Total Discounts Applied: Rs. ${summary.totalDiscounts.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text('Recent Transactions', { underline: true });
    doc.moveDown();

    orders.forEach((order, index) => {
        doc.fontSize(10).text(`${index + 1}. Order ID: ${order.orderId} | Date: ${new Date(order.createdAt).toLocaleDateString()} | Amount: Rs. ${order.pricing.totalAmount} | Status: ${order.orderStatus}`);
        doc.moveDown(0.5);
    });

    doc.end();
};

export const generateExcelWorkbook = async ({ orders, summary }, stream) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Amount (Rs)', key: 'amount', width: 15 },
        { header: 'Discount (Rs)', key: 'discount', width: 15 },
        { header: 'Status', key: 'status', width: 20 }
    ];

    orders.forEach(order => {
        worksheet.addRow({
            orderId: order.orderId,
            date: new Date(order.createdAt).toLocaleDateString(),
            customer: order.user ? order.user.fullName : 'N/A',
            amount: order.pricing.totalAmount,
            discount: (order.pricing.discountAmount || 0) + (order.pricing.couponDiscount || 0),
            status: order.orderStatus
        });
    });

    worksheet.addRow([]);
    worksheet.addRow({ orderId: 'Total Revenue:', date: summary.totalRevenue });
    worksheet.addRow({ orderId: 'Total Orders:', date: summary.totalOrdersCount });
    worksheet.addRow({ orderId: 'Total Discounts:', date: summary.totalDiscounts });

    await workbook.xlsx.write(stream);
    stream.end();
};
