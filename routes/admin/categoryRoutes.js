import express from 'express';
import { 
    loadCategories, 
    loadAddCategory, 
    addCategory, 
    loadEditCategory, 
    editCategory, 
    toggleCategoryListing,
    softDeleteCategory 
} from '../../controllers/admin/categoryController.js';
import { uploadCategory } from '../../middleware/uploadMiddleware.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Get list of categories
router.get('/categories', requireAuth('admin'), loadCategories);

// Add category forms & submission
router.get('/categories/add', requireAuth('admin'), loadAddCategory);
router.post('/categories', requireAuth('admin'), uploadCategory.single('image'), addCategory);

// Edit category forms & submission
router.get('/categories/:id/edit', requireAuth('admin'), loadEditCategory);
router.put('/categories/:id', requireAuth('admin'), uploadCategory.single('image'), editCategory);

// Toggle category listing
router.patch('/categories/:id/listing', requireAuth('admin'), toggleCategoryListing);

// Soft delete a category
router.delete('/categories/:id', requireAuth('admin'), softDeleteCategory);

export default router;
