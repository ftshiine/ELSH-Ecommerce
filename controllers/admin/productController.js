import Product from '../../models/Product.js';
import Category from '../../models/Category.js';

/**
 * GET /admin/products
 * Load products with search and pagination, sort by createdAt desc
 */
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

/**
 * GET /admin/products/add
 * Render Add Product Form
 */
export const loadAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });
        res.render('admin/product/add', { title: 'Add Product', categories, activePage: 'products' });
    } catch (error) {
        console.error('Error loading add product page:', error);
        res.status(500).send('Internal Server Error');
    }
};

/**
 * POST /admin/products
 * Add a new product with multiple image upload
 */
export const addProduct = async (req, res) => {
    try {
        const { name, description, category, regularPrice, salePrice, stock, isListed } = req.body;
        
        // Extract array of Cloudinary URLs
        const images = req.files ? req.files.map(file => file.path) : [];

        if (images.length < 3) {
            return res.status(400).json({ success: false, message: 'Minimum 3 images are required' });
        }

        const newProduct = new Product({
            name,
            description,
            category,
            regularPrice,
            salePrice,
            stock,
            images,
            isListed: isListed === 'on' || isListed === true || isListed === 'true'
        });

        await newProduct.save();
        
        return res.status(201).json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * GET /admin/products/:id/edit
 * Render Edit Product Form
 */
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

/**
 * PUT /admin/products/:id
 * Edit an existing product
 */
export const editProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, regularPrice, salePrice, stock, isListed } = req.body;

        const updateData = {
            name,
            description,
            category,
            regularPrice,
            salePrice,
            stock,
            isListed: isListed === 'on' || isListed === true || isListed === 'true'
        };

        // If new files were uploaded, we append them to the existing images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.path);
            const product = await Product.findById(id);
            updateData.images = [...product.images, ...newImages];
        }

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
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * PATCH /admin/products/:id/status
 * Toggle product listed status (Soft Delete)
 */
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
