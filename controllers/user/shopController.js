import * as shopService from '../../services/user/shopService.js';
import { STATUS_CODES, COMMON_MESSAGES } from '../../constants/index.js';

export const loadShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const userId = req.user ? req.user._id : (req.session && req.session.user ? (req.session.user.id || req.session.user._id) : null);

        const {
            products,
            categories,
            totalPages,
            wishlistProductIds
        } = await shopService.getShopProducts({
            page,
            limit,
            search: req.query.search,
            category: req.query.category,
            skinType: req.query.skinType,
            minPrice: req.query.minPrice,
            maxPrice: req.query.maxPrice,
            sort: req.query.sort,
            userId
        });

        const breadcrumbs = [
            { name: 'Home', url: '/home' },
            { name: 'Shop All', url: '/shop' }
        ];

        res.render('user/shop/index', {
            title: 'Shop All',
            products,
            categories,
            currentPage: page,
            totalPages,
            currentQuery: req.query,
            breadcrumbs,
            wishlistProductIds
        });

    } catch (error) {
        console.error('Error loading shop page:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//Load product details
export const loadProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const currentUserId = req.session && req.session.user ? (req.session.user.id || req.session.user._id) : null;

        const details = await shopService.getProductDetails(productId, currentUserId);

        if (!details) {
            return res.redirect('/shop');
        }

        const breadcrumbs = [
            { name: 'Home', url: '/home' },
            { name: 'Shop', url: '/shop' },
            { name: details.product.name, url: `/product/${details.product._id}` }
        ];

        res.render('user/product/detail', {
            title: details.product.name,
            product: details.product,
            relatedProducts: details.relatedProducts,
            reviews: details.reviews,
            breadcrumbs,
            currentUserId,
            inCartVariants: details.inCartVariants,
            inWishlist: details.inWishlist,
            hasDeliveredOrder: details.hasDeliveredOrder
        });

    } catch (error) {
        console.error('Error loading product details:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//product review
export const submitReview = async (req, res) => {
    try {
        const productId = req.params.id;
        const { rating, comment } = req.body;
        const userId = req.session.user.id || req.session.user._id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Please provide a valid rating between 1 and 5' });
        }

        if (!comment || comment.trim() === '') {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Please provide a comment' });
        }

        await shopService.addProductReview({ productId, userId, rating, comment });

        return res.status(STATUS_CODES.OK).json({ success: true, message: 'Review submitted successfully' });

    } catch (error) {
        console.error('Error submitting review:', error);
        if (error.code === 11000) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'You have already reviewed this product' });
        }
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

//Delete product review
export const deleteReview = async (req, res) => {
    try {
        const { productId, reviewId } = req.params;
        const userId = req.session.user.id || req.session.user._id;

        await shopService.removeProductReview({ productId, reviewId, userId });

        return res.status(STATUS_CODES.OK).json({ success: true, message: 'Review deleted successfully' });

    } catch (error) {
        console.error('Error deleting review:', error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};
