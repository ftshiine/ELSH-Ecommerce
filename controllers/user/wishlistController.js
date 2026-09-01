import * as wishlistService from '../../services/user/wishlistService.js';
import { STATUS_CODES, COMMON_MESSAGES, WISHLIST_MESSAGES } from '../../constants/index.js';

export const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;
        const validItems = await wishlistService.getUserWishlist(userId);

        res.render('user/wishlist/index', {
            title: 'Wishlist',
            wishlistItems: validItems
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('user/404', { message: WISHLIST_MESSAGES.LOAD_FAILED });
    }
};

export const toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;
        const { productId } = req.body;

        const result = await wishlistService.toggleWishlistItem(userId, productId);
        res.status(STATUS_CODES.OK).json({ success: true, ...result });
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || WISHLIST_MESSAGES.UPDATE_FAILED });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;
        const { productId } = req.params;

        await wishlistService.removeWishlistItem(userId, productId);
        res.status(STATUS_CODES.OK).json({ success: true, message: WISHLIST_MESSAGES.REMOVED_SUCCESS });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        res.status(status).json({ success: false, message: error.message || WISHLIST_MESSAGES.REMOVE_FAILED });
    }
};
