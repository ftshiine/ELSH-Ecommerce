import * as dashboardService from '../../services/admin/dashboardService.js';
import { STATUS_CODES, COMMON_MESSAGES } from '../../constants/index.js';

const loadDashboard = async (req, res) => {
  try {
    const metrics = await dashboardService.getDashboardMetrics();

    res.render('admin/dashboard/index', {
      admin: req.session.admin,
      activePage: 'dashboard',
      ...metrics
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

const getChartData = async (req, res) => {
  try {
    const { filter = 'monthly' } = req.query;
    const chartData = await dashboardService.getDashboardChartData(filter);
    res.status(STATUS_CODES.OK).json({ success: true, data: chartData });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to fetch chart data' });
  }
};

const downloadLedgerExcel = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'elsh_ledger_book.xlsx');

    await dashboardService.generateLedgerExcelWorkbook(res);
  } catch (error) {
    console.error('Error generating Ledger Book:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Failed to generate Ledger Book');
  }
};

export { loadDashboard, getChartData, downloadLedgerExcel };