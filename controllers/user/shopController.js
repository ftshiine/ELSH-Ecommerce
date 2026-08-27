import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import Review from '../../models/Review.js';
import Cart from '../../models/Cart.js';
import Wishlist from '../../models/Wishlist.js';
import Order from '../../models/Order.js';
import mongoose from 'mongoose';

export const loadShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const categories = await Category.find({ isListed: true, isDeleted: false });

        const query = { isListed: true };

        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }

        if (req.query.category) {
            const catArr = Array.isArray(req.query.category) ? req.query.category : [req.query.category];
            query.category = { $in: catArr.map(id => new mongoose.Types.ObjectId(id)) };
        }

        if (req.query.skinType) {
            const skinArr = Array.isArray(req.query.skinType) ? req.query.skinType : [req.query.skinType];
            query.skinType = { $in: skinArr };
        }

        if (req.query.minPrice || req.query.maxPrice) {
            const min = parseFloat(req.query.minPrice) || 0;
            const max = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;

            query.variants = {
                $elemMatch: {
                    $or: [
                        { offerPrice: { $gte: min, $lte: max, $type: 'number' } },
                        { offerPrice: { $not: { $type: 'number' } }, salePrice: { $gte: min, $lte: max, $type: 'number' } },
                        { offerPrice: { $not: { $type: 'number' } }, salePrice: { $not: { $type: 'number' } }, regularPrice: { $gte: min, $lte: max } }
                    ]
                }
            };
        }

        if (req.query.sort === 'featured') {
            query.isFeatured = true;
        }

        let sortQuery = { isFeatured: -1, createdAt: -1 };
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price-asc':
                    sortQuery = { regularPrice: 1 };
                    break;
                case 'price-desc':
                    sortQuery = { regularPrice: -1 };
                    break;
                case 'featured':
                    sortQuery = { createdAt: -1 };
                    break;
                case 'name-asc':
                    sortQuery = { name: 1 };
                    break;
                case 'name-desc':
                    sortQuery = { name: -1 };
                    break;
            }
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        let products;
        if (req.query.sort === 'price-asc' || req.query.sort === 'price-desc') {
            const sortDirection = req.query.sort === 'price-desc' ? -1 : 1;
            products = await Product.aggregate([
                { $match: query },
                {
                    $addFields: {
                        effectivePrice: {
                            $min: {
                                $map: {
                                    input: "$variants",
                                    as: "variant",
                                    in: {
                                        $min: [
                                            "$$variant.regularPrice",
                                            { $cond: [{ $gt: ["$$variant.salePrice", 0] }, "$$variant.salePrice", "$$variant.regularPrice"] },
                                            { $cond: [{ $gt: ["$$variant.offerPrice", 0] }, "$$variant.offerPrice", "$$variant.regularPrice"] }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { effectivePrice: sortDirection } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "categories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } }
            ]);
        } else {
            products = await Product.find(query)
                .populate('category')
                .sort(sortQuery)
                .skip(skip)
                .limit(limit);
        }

        const breadcrumbs = [
            { name: 'Home', url: '/home' },
            { name: 'Shop All', url: '/shop' }
        ];

        let suggestions = [];
        if (products.length > 0) {
            const categoryIds = products.map(p => {
                if (p.category && p.category._id) return p.category._id;
                return p.category;
            });
            const productIds = products.map(p => p._id);

            suggestions = await Product.find({
                category: { $nin: categoryIds },
                _id: { $nin: productIds },
                isListed: true
            }).limit(4).populate('category');
        }

        let wishlistProductIds = [];
        if (req.user && req.user._id) {
            const wishlist = await Wishlist.findOne({ user: req.user._id });
            if (wishlist) {
                wishlistProductIds = wishlist.items.map(item => item.product.toString());
            }
        }

        res.render('user/shop/index', {
            title: 'Shop All',
            products,
            categories,
            currentPage: page,
            totalPages,
            currentQuery: req.query,
            breadcrumbs,
            suggestions,
            wishlistProductIds
        });

    } catch (error) {
        console.error('Error loading shop page:', error);
        res.status(500).send('Internal Server Error');
    }
};

//Load product details
export const loadProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId).populate('category');

        if (!product || !product.isListed) {
            return res.redirect('/shop');
        }

        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id },
            isListed: true
        }).limit(4);


        const reviews = await Review.find({ product: product._id })
            .populate('user', 'fullName profileImage')
            .sort({ createdAt: -1 });

        const currentUserId = req.session && req.session.user ? (req.session.user.id || req.session.user._id) : null;

        let inCartVariants = [];
        let inWishlist = false;
        let hasDeliveredOrder = false;
        
        if (currentUserId) {
            const cart = await Cart.findOne({ user: currentUserId });
            if (cart) {
                const cartItems = cart.items.filter(item => item.product.toString() === productId);
                inCartVariants = cartItems.map(item => item.variantSize);
            }
            
            const wishlist = await Wishlist.findOne({ user: currentUserId });
            if (wishlist) {
                inWishlist = wishlist.items.some(item => item.product.toString() === productId);
            }
            
            const deliveredOrder = await Order.findOne({
                user: currentUserId,
                orderStatus: 'DELIVERED',
                'items.product': productId
            });
            if (deliveredOrder) {
                hasDeliveredOrder = true;
            }
        }

        const breadcrumbs = [
            { name: 'Home', url: '/home' },
            { name: 'Shop', url: '/shop' },
            { name: product.name, url: `/product/${product._id}` }
        ];

        res.render('user/product/detail', {
            title: product.name,
            product,
            relatedProducts,
            reviews,
            breadcrumbs,
            currentUserId,
            inCartVariants,
            inWishlist,
            hasDeliveredOrder
        });

    } catch (error) {
        console.error('Error loading product details:', error);
        res.status(500).send('Internal Server Error');
    }
};


//product review
export const submitReview = async (req, res) => {
    try {
        const productId = req.params.id;
        const { rating, comment } = req.body;
        const userId = req.session.user.id || req.session.user._id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5' });
        }

        if (!comment || comment.trim() === '') {
            return res.status(400).json({ success: false, message: 'Please provide a comment' });
        }

        const hasDeliveredOrder = await Order.findOne({
            user: userId,
            orderStatus: 'DELIVERED',
            'items.product': productId
        });
        
        if (!hasDeliveredOrder) {
            return res.status(403).json({ success: false, message: 'You can only review products you have purchased and received.' });
        }

        const existingReview = await Review.findOne({ product: productId, user: userId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
        }

        const newReview = new Review({
            product: productId,
            user: userId,
            rating: Number(rating),
            comment: comment.trim()
        });

        await newReview.save();

        const allReviews = await Review.find({ product: productId });
        const reviewCount = allReviews.length;
        const sumRatings = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        const averageRating = sumRatings / reviewCount;

        await Product.findByIdAndUpdate(productId, {
            reviewCount,
            averageRating: averageRating ? averageRating.toFixed(1) : 0
        });

        return res.status(200).json({ success: true, message: 'Review submitted successfully' });

    } catch (error) {
        console.error('Error submitting review:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
        }
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

//Delete product review
export const deleteReview = async (req, res) => {
    try {
        const { productId, reviewId } = req.params;
        const userId = req.session.user.id || req.session.user._id;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
        }

        await Review.findByIdAndDelete(reviewId);

        const allReviews = await Review.find({ product: productId });
        const reviewCount = allReviews.length;
        const sumRatings = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        const averageRating = reviewCount > 0 ? (sumRatings / reviewCount).toFixed(1) : 0;

        await Product.findByIdAndUpdate(productId, {
            reviewCount,
            averageRating
        });

        return res.status(200).json({ success: true, message: 'Review deleted successfully' });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
