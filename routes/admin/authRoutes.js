import express from 'express';
import { loadLogin, login, logout } from '../../controllers/admin/authController.js';
import { isAdminLoggedIn, isAdminLoggedOut } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/login',isAdminLoggedOut, loadLogin);
router.post('/login',isAdminLoggedOut, login);
router.get('/logout',isAdminLoggedIn, logout);

export default router;