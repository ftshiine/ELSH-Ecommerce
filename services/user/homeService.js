import Product from '../../models/Product.js';
import Category from '../../models/Category.js';

export const getHomeData = async () => {
    const [featuredProducts, categories] = await Promise.all([
        Product.find({ isListed: true, isFeatured: true }).limit(8).populate('category'),
        Category.find({ isListed: true, isDeleted: false })
    ]);

    return {
        featuredProducts,
        categories
    };
};

export const getLandingData = async () => {
    const featuredProducts = await Product.find({ isListed: true, isFeatured: true }).limit(4);
    return { featuredProducts };
};
