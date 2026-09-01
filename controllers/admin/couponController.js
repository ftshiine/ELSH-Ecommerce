import * as couponService from '../../services/admin/couponService.js';
import { STATUS_CODES, COMMON_MESSAGES, COUPON_MESSAGES } from '../../constants/index.js';

export const loadCoupons = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const {
            coupons,
            totalCoupons,
            totalPages,
            stats
        } = await couponService.getCouponsAdmin({ page, limit });

        res.render('admin/coupon/index', {
            title: 'Coupon Management',
            activePage: 'coupons',
            coupons,
            currentPage: page,
            totalPages,
            totalCoupons,
            stats
        });
    } catch (error) {
        console.error('Error loading coupons:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('admin/500');
    }
};

export const loadCreateCoupon = async (req, res) => {
    try {
        const categories = await couponService.getActiveCategories();
        res.render('admin/coupon/create', {
            title: 'Create New Coupon',
            activePage: 'coupons',
            categories
        });
    } catch (error) {
        console.error('Error loading create coupon:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('admin/500');
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

        const couponData = {
            code,
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
        };

        await couponService.createCoupon(couponData);

        res.status(STATUS_CODES.CREATED).json({ success: true, message: COUPON_MESSAGES.CREATED_SUCCESS });
    } catch (error) {
        console.error('Error creating coupon:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || COUPON_MESSAGES.CREATE_FAILED });
    }
};

export const toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await couponService.toggleCouponStatus(req.params.id);

        res.status(STATUS_CODES.OK).json({ success: true, message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully.` });
    } catch (error) {
        console.error('Error toggling coupon status:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.SERVER_ERROR });
    }
};
