import Product from '../../models/Product.js';
import User from '../../models/User.js';

const loadDashboard = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'user' });

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
      lowStockItems
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
};

export { loadDashboard };