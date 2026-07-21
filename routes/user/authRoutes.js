import express from 'express';
import passport from 'passport';
import { loadSignup, signup, loadOTP, verifyOTPHandler, resendOTP, loadLogin, login, logout, googleAuthCallback } from '../../controllers/user/authController.js';
import { loadForgotPassword, sendForgotPasswordOTP, loadForgotOTP, verifyForgotOTP, resendForgotOTP, loadResetPassword, resetPassword } from '../../controllers/user/passwordController.js';
import { requireAuth, requireGuest } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Signup routes
router.get('/signup', requireGuest('user'), loadSignup);
router.post('/signup', requireGuest('user'), signup);

// OTP routes
router.get('/otp', requireGuest('user'), loadOTP);
router.post('/otp', requireGuest('user'), verifyOTPHandler);
router.post('/otp/resend', requireGuest('user'), resendOTP);

// Login routes
router.get('/login', requireGuest('user'), loadLogin);
router.post('/login', requireGuest('user'), login);

// Logout route
router.get('/logout', requireAuth('user'), logout);

// Forgot Password routes
router.get('/forgot-password', requireGuest('user'), loadForgotPassword);
router.post('/forgot-password', requireGuest('user'), sendForgotPasswordOTP);
router.get('/forgot-password/otp', loadForgotOTP);
router.post('/forgot-password/otp', verifyForgotOTP);
router.post('/forgot-password/otp/resend', resendForgotOTP);
router.get('/forgot-password/reset', loadResetPassword);
router.post('/forgot-password/reset', resetPassword);

// Google OAuth routes
router.get('/auth/google', requireGuest('user'), passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/auth/google/callback',
  requireGuest('user'),
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleAuthCallback
);

export default router;