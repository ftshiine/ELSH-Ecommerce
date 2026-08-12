import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { getInventory, updateStock } from '../../controllers/admin/inventoryController.js';

const router = express.Router();

router.get('/inventory', requireAuth('admin'), getInventory);
router.post('/inventory/update', requireAuth('admin'), updateStock);

export default router;
