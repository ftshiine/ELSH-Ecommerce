import Wishlist from '../../models/Wishlist.js';
import Product from '../../models/Product.js';
import mongoose from 'mongoose';

export const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;
        
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

        res.render('user/wishlist/index', {
            title: 'Wishlist',
            wishlistItems: validItems
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).render('user/404', { message: 'Failed to load wishlist' });
    }
};

export const toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;
        const { productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let wishlist = await Wishlist.findOne({ user: userId });
        
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: userId, items: [] });
        }

        const existingItemIndex = wishlist.items.findIndex(item => item.product.toString() === productId);

        let inWishlist = false;

        if (existingItemIndex > -1) {
            // Remove from wishlist
            wishlist.items.splice(existingItemIndex, 1);
        } else {
            // Add to wishlist
            wishlist.items.push({ product: productId });
            inWishlist = true;
        }

        await wishlist.save();

        res.json({ success: true, inWishlist, message: inWishlist ? 'Added to wishlist' : 'Removed from wishlist' });
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating wishlist' });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item => item.product.toString() !== productId);
        await wishlist.save();

        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
    }
};
