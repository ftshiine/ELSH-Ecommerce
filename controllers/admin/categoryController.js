import * as categoryService from '../../services/admin/categoryService.js';
import { STATUS_CODES, COMMON_MESSAGES, CATEGORY_MESSAGES } from '../../constants/index.js';

export const loadCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const search = req.query.search || '';

        const {
            categories,
            totalCategories,
            activeCategories,
            inactiveCategories,
            totalPages
        } = await categoryService.getCategoriesAdmin({ page, limit, search });

        res.render('admin/category/list', {
            categories,
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

export const loadAddCategory = async (req, res) => {
    try {
        res.render('admin/category/add', { title: 'Add Category', activePage: 'category' });
    } catch (error) {
        console.error('Error loading add category page:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//Add a new category
export const addCategory = async (req, res) => {
    try {
        const { name, description, isListed } = req.body;
        const image = req.file ? req.file.path : null;

        if (!name || name.trim().length < 3 || name.trim().length > 50) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.NAME_VALIDATION });
        }

        const nameRegex = /^[a-zA-Z0-9\s\-]+$/;
        if (!nameRegex.test(name.trim())) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.NAME_FORMAT });
        }

        if (!description || description.trim().length < 10 || description.trim().length > 500) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.DESC_VALIDATION });
        }

        if (!image) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.IMAGE_REQUIRED });
        }

        const existingCategory = await categoryService.checkCategoryNameExists(name);

        if (existingCategory) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.ALREADY_EXISTS });
        }

        const newCategoryData = {
            name,
            description,
            image,
            isListed: isListed === 'on' || isListed === true
        };

        await categoryService.createCategory(newCategoryData);

        return res.status(STATUS_CODES.CREATED).json({ success: true, message: CATEGORY_MESSAGES.ADDED_SUCCESS });
    } catch (error) {
        console.error('Error adding category:', error instanceof Error ? error.stack : JSON.stringify(error, null, 2));

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: messages.join(', ') });
        }

        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

export const loadEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoryService.getCategoryById(id);
        if (!category) {
            return res.redirect('/admin/categories');
        }
        res.render('admin/category/edit', { title: 'Edit Category', category, activePage: 'category' });
    } catch (error) {
        console.error('Error loading edit category page:', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(COMMON_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

//Edit category
export const editCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isListed } = req.body;

        if (!name || name.trim().length < 3 || name.trim().length > 50) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.NAME_VALIDATION });
        }

        const nameRegex = /^[a-zA-Z0-9\s\-]+$/;
        if (!nameRegex.test(name.trim())) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.NAME_FORMAT });
        }

        if (!description || description.trim().length < 10 || description.trim().length > 500) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.DESC_VALIDATION });
        }

        const existingCategory = await categoryService.checkCategoryNameExists(name, id);

        if (existingCategory) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: CATEGORY_MESSAGES.NAME_IN_USE });
        }

        const updateData = {
            name,
            description,
            isListed: isListed === 'on' || isListed === true || isListed === 'true'
        };

        if (req.file) {
            updateData.image = req.file.path;
        }

        const updatedCategory = await categoryService.updateCategory(id, updateData);

        if (!updatedCategory) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: CATEGORY_MESSAGES.NOT_FOUND });
        }

        return res.status(STATUS_CODES.OK).json({ success: true, message: CATEGORY_MESSAGES.UPDATED_SUCCESS, category: updatedCategory });
    } catch (error) {
        console.error('Error editing category:', error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

//category toggle(Listed / unlisted)
export const toggleCategoryListing = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoryService.toggleCategoryListing(id);

        if (!category) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: CATEGORY_MESSAGES.NOT_FOUND });
        }

        const statusMessage = category.isListed ? CATEGORY_MESSAGES.LISTED_SUCCESS : CATEGORY_MESSAGES.UNLISTED_SUCCESS;

        return res.status(STATUS_CODES.OK).json({ success: true, message: statusMessage, isListed: category.isListed });
    } catch (error) {
        console.error('Error toggling category listing:', error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

