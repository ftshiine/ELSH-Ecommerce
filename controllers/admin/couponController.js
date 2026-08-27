import Coupon from '../../models/Coupon.js';
import Category from '../../models/Category.js';
import Order from '../../models/Order.js';

export const loadCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);

    // Calculate stats
    const activeCampaigns = await Coupon.countDocuments({ isActive: true });
    const allCoupons = await Coupon.find();
    const totalRedemptions = allCoupons.reduce((sum, coupon) => sum + coupon.usedCount, 0);

    // Fetch actual best performing coupon from valid orders
    let bestPerforming = { sales: 0, code: 'N/A' };
    const bestCouponAgg = await Order.aggregate([
      { 
        $match: { 
          'pricing.couponCode': { $exists: true, $ne: null, $ne: "" },
          orderStatus: { $nin: ['CANCELLED', 'RETURNED'] }
        } 
      },
      {
        $group: {
          _id: '$pricing.couponCode',
          totalSales: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 1 }
    ]);

    if (bestCouponAgg.length > 0) {
      bestPerforming = { 
        sales: bestCouponAgg[0].totalSales, 
        code: bestCouponAgg[0]._id 
      };
    }

    res.render('admin/coupon/index', {
      title: 'Coupon Management',
      activePage: 'coupons',
      coupons,
      currentPage: page,
      totalPages,
      totalCoupons,
      stats: {
        activeCampaigns,
        totalRedemptions,
        bestPerforming
      }
    });
  } catch (error) {
    console.error('Error loading coupons:', error);
    res.status(500).render('admin/500');
  }
};

export const loadCreateCoupon = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false, isListed: true });
    res.render('admin/coupon/create', {
      title: 'Create New Coupon',
      activePage: 'coupons',
      categories
    });
  } catch (error) {
    console.error('Error loading create coupon:', error);
    res.status(500).render('admin/500');
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountLimit,
      startDate,
      startTime,
      endDate,
      endTime,
      usageLimit,
      limitPerUser,
      applicableCategories,
      isFirstPurchaseOnly,
      restoreOnCancel
    } = req.body;

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists.' });
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      title,
      description,
      discountType,
      discountValue: Number(discountValue),
      minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : 0,
      maxDiscountLimit: maxDiscountLimit ? Number(maxDiscountLimit) : null,
      startDate: new Date(`${startDate}T${startTime}:00`),
      endDate: (endDate && endTime) ? new Date(`${endDate}T${endTime}:00`) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      limitPerUser: limitPerUser === 'on' || limitPerUser === true,
      applicableCategories: applicableCategories ? (Array.isArray(applicableCategories) ? applicableCategories : [applicableCategories]) : [],
      isFirstPurchaseOnly: isFirstPurchaseOnly === 'on' || isFirstPurchaseOnly === true,
      restoreOnCancel: restoreOnCancel === 'on' || restoreOnCancel === true
    });

    await newCoupon.save();

    res.status(201).json({ success: true, message: 'Coupon created successfully.' });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to create coupon.' });
  }
};

export const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({ success: true, message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully.` });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
