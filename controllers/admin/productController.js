import Product from '../../models/Product.js';
import Category from '../../models/Category.js';

//load products
export const loadProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        let search = '';
        if (req.query.search) {
            search = req.query.search;
        }

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
        res.status(500).send('Internal Server Error');
    }
};

//Load add product
export const loadAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });
        res.render('admin/product/add', { title: 'Add Product', categories, activePage: 'products' });
    } catch (error) {
        console.error('Error loading add product page:', error);
        res.status(500).send('Internal Server Error');
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
                return res.status(400).json({ success: false, message: 'Invalid variants format' });
            }
        }

        if (!parsedVariants || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one variant is required' });
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

        const newProduct = new Product({
            name,
            description,
            category,
            brand,
            skinType: processedSkinType,
            variants: parsedVariants,
            returnWindowDays: returnWindowDays !== undefined ? Number(returnWindowDays) : 7,
            isListed: isListed === 'on' || isListed === true || isListed === 'true',
            isFeatured: isFeatured === 'on' || isFeatured === true || isFeatured === 'true'
        });

        await newProduct.save();

        return res.status(201).json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
};

//load edit product form
export const loadEditProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id).populate('category');
        if (!product) {
            return res.redirect('/admin/products');
        }

        const categories = await Category.find({ isListed: true });
        res.render('admin/product/edit', { title: 'Edit Product', product, categories, activePage: 'products' });
    } catch (error) {
        console.error('Error loading edit product page:', error);
        res.status(500).send('Internal Server Error');
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
                return res.status(400).json({ success: false, message: 'Invalid variants format' });
            }
        }

        if (!parsedVariants || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one variant is required' });
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

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        return res.status(200).json({ success: true, message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        console.error('Error editing product:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
};

//product list & unlist
export const toggleProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.isListed = !product.isListed;
        await product.save();

        const statusMessage = product.isListed ? 'Product listed successfully' : 'Product unlisted successfully';

        return res.status(200).json({ success: true, message: statusMessage, isListed: product.isListed });
    } catch (error) {
        console.error('Error toggling product status:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
