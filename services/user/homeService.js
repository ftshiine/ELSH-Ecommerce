import Product from '../../models/Product.js';
import Category from '../../models/Category.js';

export const getHomeData = async () => {
    const categories = await Category.find({ isListed: true, isDeleted: false });
    const validCategoryIds = categories.map(cat => cat._id);

    const featuredProducts = await Product.find({ 
        isListed: true, 
        isFeatured: true,
        isBlocked: false,
        category: { $in: validCategoryIds },
        variants: { $elemMatch: { stock: { $gt: 0 } } }
    }).limit(8).populate('category');

    return {
        featuredProducts,
        categories
    };
};

export const getLandingData = async () => {
    const activeCategories = await Category.find({ isListed: true, isDeleted: false }).select('_id');
    const validCategoryIds = activeCategories.map(cat => cat._id);

    let featuredProducts = await Product.find({ 
        isListed: true, 
        isBlocked: false, 
        isFeatured: true,
        category: { $in: validCategoryIds },
        variants: { $elemMatch: { stock: { $gt: 0 } } }
    })
    .populate('category')
    .limit(8);

    // Fallback: if not enough featured products, fill with recent listed products
    if (featuredProducts.length < 4) {
        const existingIds = featuredProducts.map(p => p._id);
        const filler = await Product.find({
            isListed: true,
            isBlocked: false,
            category: { $in: validCategoryIds },
            _id: { $nin: existingIds },
            variants: { $elemMatch: { stock: { $gt: 0 } } }
        })
        .populate('category')
        .sort({ createdAt: -1 })
        .limit(8 - featuredProducts.length);
        
        featuredProducts = [...featuredProducts, ...filler];
    }

    return { featuredProducts };
};
