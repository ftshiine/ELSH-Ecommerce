import express from 'express';
import { loadSignup, signup, loadOTP, verifyOTPHandler, resendOTP,loadLogin,login,logout } from '../../controllers/user/authController.js';

const router = express.Router();

router.get('/signup', loadSignup);
router.post('/signup', signup);
router.get('/otp', loadOTP);
router.post('/otp', verifyOTPHandler);
router.post('/otp/resend', resendOTP);
router.get('/login',loadLogin);
router.post('/login',login);
router.get('/logout',logout);

export default router;