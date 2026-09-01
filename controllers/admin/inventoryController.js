import * as inventoryService from '../../services/admin/inventoryService.js';
import { STATUS_CODES, COMMON_MESSAGES, INVENTORY_MESSAGES } from '../../constants/index.js';

export const getInventory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const search = req.query.search ? req.query.search.trim() : '';
    const categoryFilter = req.query.category || '';
    const statusFilter = req.query.status || '';

    const {
      metrics,
      categories,
      variants,
      totalPages,
      totalItems
    } = await inventoryService.getInventoryData({
      page,
      limit,
      search,
      categoryFilter,
      statusFilter
    });

    res.render('admin/inventory/index', {
      title: 'Inventory Management',
      activePage: 'inventory',
      metrics,
      categories,
      variants,
      currentPage: page,
      totalPages,
      totalItems,
      filters: {
        search,
        category: categoryFilter,
        status: statusFilter
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.redirect('/admin/dashboard');
  }
};

export const updateStock = async (req, res) => {
  try {
    const { productId, variantId, newStock } = req.body;

    const result = await inventoryService.updateVariantStock({ productId, variantId, newStock });

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: INVENTORY_MESSAGES.UPDATED_SUCCESS,
      newStatus: result.newStatus
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    const statusCode = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
