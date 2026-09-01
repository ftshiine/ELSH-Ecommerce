import * as cartService from '../../services/user/cartService.js';
import { STATUS_CODES, COMMON_MESSAGES, CART_MESSAGES, COUPON_MESSAGES } from '../../constants/index.js';

export const loadCart = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;

        const { cart, stockAdjustedMessages } = await cartService.getCart(userId);

        const relatedProducts = await cartService.getCartRelatedProducts();

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Cart', url: '/cart' }
        ];

        res.render('user/cart/index', {
            title: 'Your Cart',
            cart,
            relatedProducts,
            breadcrumbs,
            stockAdjustedMessages: stockAdjustedMessages || []
        });
    } catch (error) {
        console.error('Error loading cart page:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//Add to cart
export const addToCart = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        const quantity = req.body.quantity;
        const variantSize = req.body.variantSize;

        await cartService.addToCart({ userId, productId, variantSize, quantity });

        res.status(STATUS_CODES.OK).json({ success: true, message: CART_MESSAGES.ITEM_ADDED });
    } catch (error) {
        console.error('Error adding to cart:', error);
        if (error.code === 11000) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: COMMON_MESSAGES.TOO_MANY_REQUESTS });
        }
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

//update quantity of product
export const updateQuantity = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        const action = req.body.action;
        const variantSize = req.body.variantSize;

        const result = await cartService.updateCartQuantity({
            userId,
            productId,
            variantSize,
            action
        });

        res.status(STATUS_CODES.OK).json({
            success: true,
            message: 'Quantity updated.',
            ...result
        });

    } catch (error) {
        console.error('Error updating cart quantity:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

//Remove product from cart
export const removeFromCart = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        const variantSize = req.body.variantSize;

        const result = await cartService.removeFromCart({ userId, productId, variantSize });

        res.status(STATUS_CODES.OK).json({
            success: true,
            message: CART_MESSAGES.ITEM_REMOVED,
            ...result
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.session.user.id || req.session.user._id;

        const result = await cartService.applyCouponToCart({ userId, code });

        res.status(STATUS_CODES.OK).json({
            success: true,
            message: COUPON_MESSAGES.APPLIED_SUCCESS,
            ...result
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;

        const result = await cartService.removeCouponFromCart(userId);

        res.status(STATUS_CODES.OK).json({
            success: true,
            message: COUPON_MESSAGES.REMOVED_SUCCESS,
            ...result
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};
