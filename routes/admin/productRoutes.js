import express from 'express';
import {
    loadProducts,
    loadAddProduct,
    addProduct,
    loadEditProduct,
    editProduct,
    toggleProductStatus
} from '../../controllers/admin/productController.js';
import { uploadProducts } from '../../middleware/uploadMiddleware.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/products', requireAuth('admin'), loadProducts);

router.get('/products/add', requireAuth('admin'), loadAddProduct);
router.post('/products', requireAuth('admin'), uploadProducts.any(), addProduct);

router.get('/products/:id/edit', requireAuth('admin'), loadEditProduct);
router.put('/products/:id', requireAuth('admin'), uploadProducts.any(), editProduct);

router.patch('/products/:id/status', requireAuth('admin'), toggleProductStatus);

export default router;
