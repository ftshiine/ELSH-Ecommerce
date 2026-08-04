import Product from '../../models/Product.js';
import User from '../../models/User.js';

const loadDashboard = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'user' });
    res.render('admin/dashboard/index', { 
      admin: req.session.admin, 
      activePage: 'dashboard',
      totalProducts,
      totalCustomers
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
};

export { loadDashboard };