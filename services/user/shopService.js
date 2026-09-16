import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import Review from '../../models/Review.js';
import Cart from '../../models/Cart.js';
import Wishlist from '../../models/Wishlist.js';
import Order from '../../models/Order.js';
import mongoose from 'mongoose';
import { STATUS_CODES } from '../../constants/index.js';

export const getShopProducts = async ({
    page = 1,
    limit = 3,
    search,
    category,
    skinType,
    minPrice,
    maxPrice,
    sort,
    userId
}) => {
    const skip = (page - 1) * limit;

    const categories = await Category.find({ isListed: true, isDeleted: false });

    const query = { isListed: true };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    if (category) {
        const catArr = Array.isArray(category) ? category : [category];
        const validIds = catArr.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
        if (validIds.length > 0) {
            query.category = { $in: validIds };
        }
    }

    if (skinType) {
        const skinArr = Array.isArray(skinType) ? skinType : [skinType];
        // Case-insensitive match — DB values may be stored in any casing
        query.skinType = {
            $elemMatch: {
                $in: skinArr.map(s => new RegExp(`^${s.trim()}$`, 'i'))
            }
        };
    }

    if (minPrice || maxPrice) {
        const min = parseFloat(minPrice) || 0;
        const max = parseFloat(maxPrice) || Number.MAX_SAFE_INTEGER;


        query.variants = {
            $elemMatch: {
                $or: [
                    // Variant has a valid offer price within range
                    { offerPrice: { $gt: 0, $gte: min, $lte: max } },
                    // No valid offer price, but has a valid sale price within range
                    { offerPrice: { $not: { $gt: 0 } }, salePrice: { $gt: 0, $gte: min, $lte: max } },
                    // Neither offer nor sale price — fall back to regularPrice
                    { offerPrice: { $not: { $gt: 0 } }, salePrice: { $not: { $gt: 0 } }, regularPrice: { $gte: min, $lte: max } }
                ]
            }
        };
    }



    let sortQuery = { isFeatured: -1, createdAt: -1 };
    if (sort) {
        switch (sort) {
            case 'price-asc':
                sortQuery = { regularPrice: 1 };
                break;
            case 'price-desc':
                sortQuery = { regularPrice: -1 };
                break;
            case 'featured':
                // Featured first, then newest — no query filter applied
                sortQuery = { isFeatured: -1, createdAt: -1 };
                break;
            case 'name-asc':
                sortQuery = { name: 1 };
                break;
            case 'name-desc':
                sortQuery = { name: -1 };
                break;
        }
    }


    const effectivePriceExpr = {
        $min: {
            $map: {
                input: '$variants',
                as: 'v',
                in: {
                    $cond: [
                        { $gt: ['$$v.offerPrice', 0] },
                        '$$v.offerPrice',
                        {
                            $cond: [
                                { $gt: ['$$v.salePrice', 0] },
                                '$$v.salePrice',
                                '$$v.regularPrice'
                            ]
                        }
                    ]
                }
            }
        }
    };

    let totalProducts;
    let products;

    if (sort === 'price-asc' || sort === 'price-desc') {
        const sortDirection = sort === 'price-desc' ? -1 : 1;


        const countResult = await Product.aggregate([
            { $match: query },
            { $count: 'total' }
        ]);
        totalProducts = countResult.length > 0 ? countResult[0].total : 0;

        products = await Product.aggregate([
            { $match: query },
            { $addFields: { effectivePrice: effectivePriceExpr } },
            { $sort: { effectivePrice: sortDirection } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
        ]);
    } else {
        totalProducts = await Product.countDocuments(query);
        products = await Product.find(query)
            .populate('category')
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);
    }

    const totalPages = Math.ceil(totalProducts / limit);


    let wishlistProductIds = [];
    if (userId) {
        const wishlist = await Wishlist.findOne({ user: userId });
        if (wishlist) {
            wishlistProductIds = wishlist.items.map(item => item.product.toString());
        }
    }

    return {
        products,
        categories,
        totalPages,
        wishlistProductIds
    };
};

export const getProductDetails = async (productId, currentUserId) => {
    const product = await Product.findById(productId).populate('category');

    if (!product || !product.isListed) {
        return null;
    }

    const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: product._id },
        isListed: true
    }).limit(4);

    const reviews = await Review.find({ product: product._id })
        .populate('user', 'fullName profileImage')
        .sort({ createdAt: -1 });

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

    return {
        product,
        relatedProducts,
        reviews,
        inCartVariants,
        inWishlist,
        hasDeliveredOrder
    };
};

export const addProductReview = async ({ productId, userId, rating, comment }) => {
    const hasDeliveredOrder = await Order.findOne({
        user: userId,
        orderStatus: 'DELIVERED',
        'items.product': productId
    });

    if (!hasDeliveredOrder) {
        const error = new Error('You can only review products you have purchased and received.');
        error.statusCode = STATUS_CODES.FORBIDDEN;
        throw error;
    }

    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
        const error = new Error('You have already reviewed this product');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
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

    return newReview;
};

export const removeProductReview = async ({ productId, reviewId, userId }) => {
    const review = await Review.findById(reviewId);
    if (!review) {
        const error = new Error('Review not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (review.user.toString() !== userId.toString()) {
        const error = new Error('Not authorized to delete this review');
        error.statusCode = STATUS_CODES.FORBIDDEN;
        throw error;
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

    return true;
};
