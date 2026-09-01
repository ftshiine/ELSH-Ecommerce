import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { STATUS_CODES, PRODUCT_MESSAGES } from '../../constants/index.js';

export const getInventoryData = async ({
    page = 1,
    limit = 5,
    search = '',
    categoryFilter = '',
    statusFilter = ''
}) => {
    const allProducts = await Product.find().populate('category');
    const categories = await Category.find();

    let totalStockUnits = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let inventoryValue = 0;

    const allVariantsFlat = [];

    allProducts.forEach(product => {
        product.variants.forEach(variant => {
            totalStockUnits += variant.stock;
            inventoryValue += (variant.stock * variant.regularPrice);

            if (variant.stock === 0) {
                outOfStockItems++;
            } else if (variant.stock <= 10) {
                lowStockItems++;
            }

            allVariantsFlat.push({
                productId: product._id,
                variantId: variant._id,
                productName: product.name,
                variantSize: variant.size,
                categoryName: product.category ? product.category.name : 'Uncategorized',
                categoryId: product.category ? product.category._id : null,
                image: variant.images && variant.images.length > 0 ? variant.images[0].replace(/^public[\\/]/, '/') : '/images/placeholder.jpg',
                stock: variant.stock,
                lastUpdated: product.updatedAt
            });
        });
    });

    let filteredVariants = allVariantsFlat;

    if (search) {
        const searchLower = search.toLowerCase();
        filteredVariants = filteredVariants.filter(v =>
            v.productName.toLowerCase().includes(searchLower)
        );
    }

    if (categoryFilter) {
        filteredVariants = filteredVariants.filter(v =>
            v.categoryId && v.categoryId.toString() === categoryFilter
        );
    }

    if (statusFilter) {
        if (statusFilter === 'In Stock') {
            filteredVariants = filteredVariants.filter(v => v.stock > 10);
        } else if (statusFilter === 'Low Stock') {
            filteredVariants = filteredVariants.filter(v => v.stock > 0 && v.stock <= 10);
        } else if (statusFilter === 'Out of Stock') {
            filteredVariants = filteredVariants.filter(v => v.stock === 0);
        }
    }

    const totalVariants = filteredVariants.length;
    const totalPages = Math.ceil(totalVariants / limit);
    const paginatedVariants = filteredVariants.slice((page - 1) * limit, page * limit);

    return {
        metrics: {
            totalProducts: allProducts.length,
            stockUnits: totalStockUnits,
            lowStockItems: lowStockItems,
            outOfStockItems: outOfStockItems,
            inventoryValue: inventoryValue
        },
        categories,
        variants: paginatedVariants,
        totalPages,
        totalItems: totalVariants
    };
};

export const updateVariantStock = async ({ productId, variantId, newStock }) => {
    const stockVal = parseInt(newStock);
    if (isNaN(stockVal) || stockVal < 0) {
        const error = new Error('Invalid stock value');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const product = await Product.findById(productId);
    if (!product) {
        const error = new Error(PRODUCT_MESSAGES.NOT_FOUND);
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
        const error = new Error('Variant not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    variant.stock = stockVal;
    await product.save();

    return {
        newStatus: stockVal === 0 ? 'Out of Stock' : (stockVal <= 10 ? 'Low Stock' : 'In Stock')
    };
};
