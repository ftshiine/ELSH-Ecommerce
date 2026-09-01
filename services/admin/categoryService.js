import Category from '../../models/Category.js';
import Product from '../../models/Product.js';

export const getCategoriesAdmin = async ({ page = 1, limit = 5, search = '' }) => {
    const skip = (page - 1) * limit;

    const query = {
        name: { $regex: '.*' + search + '.*', $options: 'i' },
        isDeleted: false
    };

    const categories = await Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalCategories = await Category.countDocuments(query);
    const activeCategories = await Category.countDocuments({ ...query, isListed: true });
    const inactiveCategories = await Category.countDocuments({ ...query, isListed: false });
    const totalPages = Math.ceil(totalCategories / limit);

    const categoriesWithProductCount = await Promise.all(categories.map(async (category) => {
        const productCount = await Product.countDocuments({ category: category._id });
        return {
            ...category.toObject(),
            productCount
        };
    }));

    return {
        categories: categoriesWithProductCount,
        totalCategories,
        activeCategories,
        inactiveCategories,
        totalPages
    };
};

export const getCategoryById = async (id) => {
    return await Category.findById(id);
};

export const checkCategoryNameExists = async (name, excludeId = null) => {
    const query = {
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return await Category.findOne(query);
};

export const createCategory = async (categoryData) => {
    const category = new Category(categoryData);
    return await category.save();
};

export const updateCategory = async (id, updateData) => {
    return await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );
};

export const toggleCategoryListing = async (id) => {
    const category = await Category.findById(id);
    if (!category || category.isDeleted) {
        return null;
    }

    category.isListed = !category.isListed;
    await category.save();

    if (category.isListed) {

        await Product.updateMany({ category: id }, { isListed: true });
    }
    return category;
};





