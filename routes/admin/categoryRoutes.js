import express from 'express';
import {
    loadCategories,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    editCategory,
    toggleCategoryListing
} from '../../controllers/admin/categoryController.js';
import { uploadCategory } from '../../middleware/uploadMiddleware.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/categories', requireAuth('admin'), loadCategories);

router.get('/categories/add', requireAuth('admin'), loadAddCategory);
router.post('/categories', requireAuth('admin'), uploadCategory.single('image'), addCategory);

router.get('/categories/:id/edit', requireAuth('admin'), loadEditCategory);
router.put('/categories/:id', requireAuth('admin'), uploadCategory.single('image'), editCategory);

router.patch('/categories/:id/listing', requireAuth('admin'), toggleCategoryListing);

export default router;
