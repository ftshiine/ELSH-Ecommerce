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

// Get list of products
router.get('/products', requireAuth('admin'), loadProducts);

// Add product forms & submission (max 5 images allowed by multer array)
router.get('/products/add', requireAuth('admin'), loadAddProduct);
router.post('/products', requireAuth('admin'), uploadProducts.array('images', 5), addProduct);

// Edit product forms & submission
router.get('/products/:id/edit', requireAuth('admin'), loadEditProduct);
router.put('/products/:id', requireAuth('admin'), uploadProducts.array('images', 5), editProduct);

// Toggle product status (Soft delete)
router.patch('/products/:id/status', requireAuth('admin'), toggleProductStatus);

export default router;
