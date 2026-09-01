import Product from '../../models/Product.js';
import Category from '../../models/Category.js';

import STATUS_CODES from '../../constants/statusCodes.js';
import MESSAGES from '../../constants/messages.js';

export const getProductsAdmin = async ({ page = 1, limit = 10, search = '' }) => {
    const skip = (page - 1) * limit;

    const query = {
        name: { $regex: '.*' + search + '.*', $options: 'i' }
    };

    const products = await Product.find(query)
        .populate('category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    return { products, totalProducts, totalPages };
};

export const getActiveCategories = async () => {
    return await Category.find({ isListed: true });
};

export const getProductByIdWithCategory = async (id) => {
    return await Product.findById(id).populate('category');
};

export const createProduct = async (productData) => {
    const newProduct = new Product(productData);
    return await newProduct.save();
};

export const updateProduct = async (id, updateData) => {
    return await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );
};

export const toggleProductStatus = async (id) => {
    const product = await Product.findById(id);
    if (!product) {
        return null;
    }
    
    product.isListed = !product.isListed;
    await product.save();

    return product;
};
