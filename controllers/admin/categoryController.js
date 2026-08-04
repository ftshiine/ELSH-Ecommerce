import Category from '../../models/Category.js';
import Product from '../../models/Product.js';


export const loadCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 2;
        const skip = (page - 1) * limit;

        let search = '';
        if (req.query.search) {
            search = req.query.search;
        }

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

        res.render('admin/category/list', {
            categories: categoriesWithProductCount,
            totalCategories,
            activeCategories,
            inactiveCategories,
            currentPage: page,
            totalPages,
            searchQuery: search,
            title: 'Category Management',
            activePage: 'category'
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).send('Internal Server Error');
    }
};


export const loadAddCategory = async (req, res) => {
    try {
        res.render('admin/category/add', { title: 'Add Category', activePage: 'category' });
    } catch (error) {
        console.error('Error loading add category page:', error);
        res.status(500).send('Internal Server Error');
    }
};

//Add a new category
export const addCategory = async (req, res) => {
    try {
        const { name, description, isListed } = req.body;
        const image = req.file ? req.file.path : null;

        if (!name || name.trim().length < 3 || name.trim().length > 50) {
            return res.status(400).json({ success: false, message: 'Category name must be between 3 and 50 characters' });
        }

        const nameRegex = /^[a-zA-Z0-9\s\-]+$/;
        if (!nameRegex.test(name.trim())) {
            return res.status(400).json({ success: false, message: 'Category name can only contain letters, numbers, spaces, and hyphens' });
        }

        if (!description || description.trim().length < 10 || description.trim().length > 500) {
            return res.status(400).json({ success: false, message: 'Description must be between 10 and 500 characters' });
        }

        if (!image) {
            return res.status(400).json({ success: false, message: 'Image is required' });
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        const newCategory = new Category({
            name,
            description,
            image,
            isListed: isListed === 'on' || isListed === true
        });

        await newCategory.save();

        return res.status(201).json({ success: true, message: 'Category added successfully' });
    } catch (error) {
        console.error('Error adding category:', error instanceof Error ? error.stack : JSON.stringify(error, null, 2));

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }

        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
};


export const loadEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        if (!category) {
            return res.redirect('/admin/categories');
        }
        res.render('admin/category/edit', { title: 'Edit Category', category, activePage: 'category' });
    } catch (error) {
        console.error('Error loading edit category page:', error);
        res.status(500).send('Internal Server Error');
    }
};

//Edit category
export const editCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isListed } = req.body;

        if (!name || name.trim().length < 3 || name.trim().length > 50) {
            return res.status(400).json({ success: false, message: 'Category name must be between 3 and 50 characters' });
        }

        const nameRegex = /^[a-zA-Z0-9\s\-]+$/;
        if (!nameRegex.test(name.trim())) {
            return res.status(400).json({ success: false, message: 'Category name can only contain letters, numbers, spaces, and hyphens' });
        }

        if (!description || description.trim().length < 10 || description.trim().length > 500) {
            return res.status(400).json({ success: false, message: 'Description must be between 10 and 500 characters' });
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category name already in use' });
        }

        const updateData = {
            name,
            description,
            isListed: isListed === 'on' || isListed === true || isListed === 'true'
        };

        if (req.file) {
            updateData.image = req.file.path;
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        return res.status(200).json({ success: true, message: 'Category updated successfully', category: updatedCategory });
    } catch (error) {
        console.error('Error editing category:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

//category toggle (Listed/unlisted)
export const toggleCategoryListing = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);

        if (!category || category.isDeleted) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.isListed = !category.isListed;
        await category.save();

        await Product.updateMany({ category: id }, { isListed: category.isListed });

        const statusMessage = category.isListed ? 'Category listed successfully' : 'Category unlisted successfully';

        return res.status(200).json({ success: true, message: statusMessage, isListed: category.isListed });
    } catch (error) {
        console.error('Error toggling category listing:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

