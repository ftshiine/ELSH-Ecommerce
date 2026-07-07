import express from 'express';
import { loadUsers, blockUnblockUser } from '../../controllers/admin/userController.js';
import { isAdminLoggedIn } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/users', isAdminLoggedIn, loadUsers);
router.post('/users/block-unblock/:userId', isAdminLoggedIn, blockUnblockUser);

export default router;