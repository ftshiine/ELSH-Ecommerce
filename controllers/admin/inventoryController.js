import Product from '../../models/Product.js';
import Category from '../../models/Category.js';

export const getInventory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const search = req.query.search ? req.query.search.trim() : '';
    const categoryFilter = req.query.category || '';
    const statusFilter = req.query.status || '';

    const allProducts = await Product.find().populate('category');
    const categories = await Category.find();

    let totalStockUnits = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let inventoryValue = 0;

    let allVariantsFlat = [];

    allProducts.forEach(product => {
      product.variants.forEach(variant => {
        totalStockUnits += variant.stock;
        inventoryValue += (variant.stock * variant.regularPrice);

        if (variant.stock === 0) {
          outOfStockItems++;
        } else if (variant.stock <= 10) {
          lowStockItems++;
        }

        allVariantsFlat.push({
          productId: product._id,
          variantId: variant._id,
          productName: product.name,
          variantSize: variant.size,
          categoryName: product.category ? product.category.name : 'Uncategorized',
          categoryId: product.category ? product.category._id : null,
          image: variant.images && variant.images.length > 0 ? variant.images[0].replace(/^public[\\/]/, '/') : '/images/placeholder.jpg',
          stock: variant.stock,
          lastUpdated: product.updatedAt
        });
      });
    });

    let filteredVariants = allVariantsFlat;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredVariants = filteredVariants.filter(v =>
        v.productName.toLowerCase().includes(searchLower)
      );
    }

    if (categoryFilter) {
      filteredVariants = filteredVariants.filter(v =>
        v.categoryId && v.categoryId.toString() === categoryFilter
      );
    }

    if (statusFilter) {
      if (statusFilter === 'In Stock') {
        filteredVariants = filteredVariants.filter(v => v.stock > 10);
      } else if (statusFilter === 'Low Stock') {
        filteredVariants = filteredVariants.filter(v => v.stock > 0 && v.stock <= 10);
      } else if (statusFilter === 'Out of Stock') {
        filteredVariants = filteredVariants.filter(v => v.stock === 0);
      }
    }

    const totalVariants = filteredVariants.length;
    const totalPages = Math.ceil(totalVariants / limit);
    const paginatedVariants = filteredVariants.slice((page - 1) * limit, page * limit);

    res.render('admin/inventory/index', {
      title: 'Inventory Management',
      activePage: 'inventory',
      metrics: {
        totalProducts: allProducts.length,
        stockUnits: totalStockUnits,
        lowStockItems: lowStockItems,
        outOfStockItems: outOfStockItems,
        inventoryValue: inventoryValue
      },
      categories,
      variants: paginatedVariants,
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalVariants,
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

    const stockVal = parseInt(newStock);
    if (isNaN(stockVal) || stockVal < 0) {
      return res.status(400).json({ success: false, message: 'Invalid stock value' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }

    variant.stock = stockVal;
    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      newStatus: stockVal === 0 ? 'Out of Stock' : (stockVal <= 10 ? 'Low Stock' : 'In Stock')
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
