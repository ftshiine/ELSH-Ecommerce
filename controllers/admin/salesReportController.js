import * as salesReportService from '../../services/admin/salesReportService.js';
import { STATUS_CODES, COMMON_MESSAGES } from '../../constants/index.js';

export const loadSalesReport = async (req, res) => {
  try {
    const { range = 'all', startDate, endDate } = req.query;
    const { start, end } = salesReportService.getDateRange(range, startDate, endDate);

    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { orders, summary } = await salesReportService.getReportData(start, end);

    // Pagination
    const totalPages = Math.ceil(orders.length / limit);
    const paginatedOrders = orders.slice((page - 1) * limit, page * limit);

    res.render('admin/sales-report/index', {
      admin: req.session.admin,
      activePage: 'sales-report',
      range,
      startDate,
      endDate,
      summary,
      orders: paginatedOrders,
      currentPage: page,
      totalPages,
      totalCount: orders.length
    });
  } catch (error) {
    console.error('Error loading sales report:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

export const downloadPdf = async (req, res) => {
  try {
    const { range = 'all', startDate, endDate } = req.query;
    const { start, end } = salesReportService.getDateRange(range, startDate, endDate);

    const { orders, summary } = await salesReportService.getReportData(start, end);

    res.setHeader('Content-disposition', 'attachment; filename=sales-report.pdf');
    res.setHeader('Content-type', 'application/pdf');

    salesReportService.generatePdfDocument({ start, end, orders, summary }, res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Failed to generate PDF');
  }
};

export const downloadExcel = async (req, res) => {
  try {
    const { range = 'all', startDate, endDate } = req.query;
    const { start, end } = salesReportService.getDateRange(range, startDate, endDate);

    const { orders, summary } = await salesReportService.getReportData(start, end);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'sales-report.xlsx');

    await salesReportService.generateExcelWorkbook({ orders, summary }, res);
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Failed to generate Excel');
  }
};
