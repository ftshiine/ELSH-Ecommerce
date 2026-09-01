import Coupon from '../../models/Coupon.js';
import Category from '../../models/Category.js';
import Order from '../../models/Order.js';
import { STATUS_CODES, COUPON_MESSAGES } from '../../constants/index.js';

export const getCouponsAdmin = async ({ page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);

    // Stats
    const activeCampaigns = await Coupon.countDocuments({ isActive: true });
    const allCoupons = await Coupon.find();
    const totalRedemptions = allCoupons.reduce((sum, coupon) => sum + coupon.usedCount, 0);

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

    return {
        coupons,
        totalCoupons,
        totalPages,
        stats: {
            activeCampaigns,
            totalRedemptions,
            bestPerforming
        }
    };
};

export const getActiveCategories = async () => {
    return await Category.find({ isDeleted: false, isListed: true });
};

export const createCoupon = async (couponData) => {
    const existingCoupon = await Coupon.findOne({ code: couponData.code.toUpperCase() });
    if (existingCoupon) {
        const error = new Error('Coupon code already exists.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const newCoupon = new Coupon({
        ...couponData,
        code: couponData.code.toUpperCase()
    });

    return await newCoupon.save();
};

export const toggleCouponStatus = async (id) => {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
        const error = new Error(COUPON_MESSAGES.NOT_FOUND);
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    coupon.isActive = !coupon.isActive;
    return await coupon.save();
};
