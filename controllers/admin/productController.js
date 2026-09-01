import * as productService from '../../services/admin/productService.js';
import { STATUS_CODES, COMMON_MESSAGES, PRODUCT_MESSAGES } from '../../constants/index.js';

//load products
export const loadProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || '';

        const { products, totalPages } = await productService.getProductsAdmin({ page, limit, search });

        res.render('admin/product/list', {
            products,
            currentPage: page,
            totalPages,
            searchQuery: search,
            title: 'Product Management',
            activePage: 'products'
        });
    } catch (error) {
        console.error('Error loading products:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//Load add product
export const loadAddProduct = async (req, res) => {
    try {
        const categories = await productService.getActiveCategories();
        res.render('admin/product/add', { title: 'Add Product', categories, activePage: 'products' });
    } catch (error) {
        console.error('Error loading add product page:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//Add new product
export const addProduct = async (req, res) => {
    try {
        const { name, description, category, brand, isListed, isFeatured, skinType, variants, returnWindowDays } = req.body;

        let parsedVariants = [];
        if (variants) {
            try {
                parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            } catch (e) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: PRODUCT_MESSAGES.INVALID_VARIANTS });
            }
        }

        if (!parsedVariants || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: PRODUCT_MESSAGES.VARIANT_REQUIRED });
        }

        // Attach images
        parsedVariants.forEach((variant, index) => {
            variant.images = [];
            if (req.files) {
                req.files.forEach(file => {
                    if (file.fieldname === `variantImages_${index}`) {
                        variant.images.push(file.path);
                    }
                });
            }
            if (variant.images.length < 3) {
                throw new Error(`Variant ${index + 1} must have at least 3 images`);
            }
        });

        const processedSkinType = Array.isArray(skinType) ? skinType : (skinType ? [skinType] : []);

        const productData = {
            name,
            description,
            category,
            brand,
            skinType: processedSkinType,
            variants: parsedVariants,
            returnWindowDays: returnWindowDays !== undefined ? Number(returnWindowDays) : 7,
            isListed: isListed === 'on' || isListed === true || isListed === 'true',
            isFeatured: isFeatured === 'on' || isFeatured === true || isFeatured === 'true'
        };

        await productService.createProduct(productData);

        return res.status(STATUS_CODES.CREATED).json({ success: true, message: PRODUCT_MESSAGES.ADDED_SUCCESS });
    } catch (error) {
        console.error('Error adding product:', error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

//load edit product form
export const loadEditProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productService.getProductByIdWithCategory(id);
        if (!product) {
            return res.redirect('/admin/products');
        }

        const categories = await productService.getActiveCategories();
        res.render('admin/product/edit', { title: 'Edit Product', product, categories, activePage: 'products' });
    } catch (error) {
        console.error('Error loading edit product page:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//Edit existing product
export const editProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, brand, isListed, isFeatured, skinType, variants, returnWindowDays } = req.body;

        let parsedVariants = [];
        if (variants) {
            try {
                parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            } catch (e) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: PRODUCT_MESSAGES.INVALID_VARIANTS });
            }
        }

        if (!parsedVariants || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: PRODUCT_MESSAGES.VARIANT_REQUIRED });
        }

        // Process images for each variant
        parsedVariants.forEach((variant, index) => {
            let finalImages = [];
            const mappingField = `variantImageMapping_${index}`;
            const imageMapping = req.body[mappingField];

            if (imageMapping) {
                const mappings = Array.isArray(imageMapping) ? imageMapping : [imageMapping];
                let fileIndex = 0;

                // Get files just for this variant
                const variantFiles = (req.files || []).filter(f => f.fieldname === `variantImages_${index}`);

                for (const map of mappings) {
                    if (map === 'NEW') {
                        if (variantFiles[fileIndex]) {
                            finalImages.push(variantFiles[fileIndex].path);
                            fileIndex++;
                        }
                    } else if (map.startsWith('http') || map.startsWith('/')) {
                        finalImages.push(map);
                    }
                }
            } else {
                // If no mapping provided, just use the newly uploaded files
                const variantFiles = (req.files || []).filter(f => f.fieldname === `variantImages_${index}`);
                finalImages = variantFiles.map(f => f.path);
            }

            if (finalImages.length === 0 && variant.images && variant.images.length > 0) {
                finalImages = variant.images;
            }

            if (finalImages.length < 3) {
                throw new Error(`Variant ${index + 1} must have at least 3 images`);
            }
            variant.images = finalImages;
        });

        const processedSkinType = Array.isArray(skinType) ? skinType : (skinType ? [skinType] : []);

        const updateData = {
            name,
            description,
            category,
            brand,
            skinType: processedSkinType,
            variants: parsedVariants,
            returnWindowDays: returnWindowDays !== undefined ? Number(returnWindowDays) : 7,
            isListed: isListed === 'on' || isListed === true || isListed === 'true',
            isFeatured: isFeatured === 'on' || isFeatured === true || isFeatured === 'true'
        };

        const updatedProduct = await productService.updateProduct(id, updateData);

        if (!updatedProduct) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: PRODUCT_MESSAGES.NOT_FOUND });
        }

        return res.status(STATUS_CODES.OK).json({ success: true, message: PRODUCT_MESSAGES.UPDATED_SUCCESS, product: updatedProduct });
    } catch (error) {
        console.error('Error editing product:', error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

//product list & unlist
export const toggleProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productService.toggleProductStatus(id);

        if (!product) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: PRODUCT_MESSAGES.NOT_FOUND });
        }

        const statusMessage = product.isListed ? PRODUCT_MESSAGES.LISTED_SUCCESS : PRODUCT_MESSAGES.UNLISTED_SUCCESS;

        return res.status(STATUS_CODES.OK).json({ success: true, message: statusMessage, isListed: product.isListed });
    } catch (error) {
        console.error('Error toggling product status:', error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};
