import Wishlist from '../../models/Wishlist.js';
import Product from '../../models/Product.js';
import mongoose from 'mongoose';
import { STATUS_CODES } from '../../constants/index.js';

export const getUserWishlist = async (userId) => {
    let wishlist = await Wishlist.findOne({ user: userId }).populate({
        path: 'items.product',
        populate: { path: 'category' }
    });

    if (!wishlist) {
        wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    // Filter out items where the product might have been deleted from DB
    const validItems = wishlist.items.filter(item => item.product != null);

    // If there were invalid items, clean them up
    if (validItems.length !== wishlist.items.length) {
        wishlist.items = validItems;
        await wishlist.save();
    }

    return validItems;
};

export const toggleWishlistItem = async (userId, productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        const error = new Error('Invalid product ID');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const product = await Product.findById(productId);
    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
        wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    const existingItemIndex = wishlist.items.findIndex(item => item.product.toString() === productId);
    let inWishlist = false;

    if (existingItemIndex > -1) {
        wishlist.items.splice(existingItemIndex, 1);
    } else {
        wishlist.items.push({ product: productId });
        inWishlist = true;
    }

    await wishlist.save();

    return {
        inWishlist,
        message: inWishlist ? 'Added to wishlist' : 'Removed from wishlist'
    };
};

export const removeWishlistItem = async (userId, productId) => {
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
        const error = new Error('Wishlist not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    wishlist.items = wishlist.items.filter(item => item.product.toString() !== productId);
    return await wishlist.save();
};
