import express from 'express';
import { loadUsers, blockUnblockUser } from '../../controllers/admin/userController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/users', requireAuth('admin'), loadUsers);
router.post('/users/block-unblock/:userId', requireAuth('admin'), blockUnblockUser);

export default router;