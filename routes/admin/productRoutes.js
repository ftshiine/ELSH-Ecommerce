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
router.post('/products', requireAuth('admin'), uploadProducts.array('images', 5), addProduct);

router.get('/products/:id/edit', requireAuth('admin'), loadEditProduct);
router.put('/products/:id', requireAuth('admin'), uploadProducts.array('images', 5), editProduct);

router.patch('/products/:id/status', requireAuth('admin'), toggleProductStatus);

export default router;
