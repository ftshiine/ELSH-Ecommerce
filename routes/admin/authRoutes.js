import express from 'express';
import { loadLogin, login, logout } from '../../controllers/admin/authController.js';
import { loadForgotPassword, sendForgotPasswordOTP, loadForgotOTP, verifyForgotOTP, resendForgotOTP, loadResetPassword, resetPassword } from '../../controllers/admin/passwordController.js';
import { requireAuth, requireGuest } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/login', requireGuest('admin'), loadLogin);
router.post('/login', requireGuest('admin'), login);
router.get('/logout', requireAuth('admin'), logout);


router.get('/forgot-password', requireGuest('admin'), loadForgotPassword);
router.post('/forgot-password', requireGuest('admin'), sendForgotPasswordOTP);
router.get('/forgot-password/otp', requireGuest('admin'), loadForgotOTP);
router.post('/forgot-password/otp', requireGuest('admin'), verifyForgotOTP);
router.post('/forgot-password/otp/resend', requireGuest('admin'), resendForgotOTP);
router.get('/forgot-password/reset', requireGuest('admin'), loadResetPassword);
router.post('/forgot-password/reset', requireGuest('admin'), resetPassword);

export default router;