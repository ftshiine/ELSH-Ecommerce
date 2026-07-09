import express from 'express';
import passport from 'passport';
import { loadSignup, signup, loadOTP, verifyOTPHandler, resendOTP, loadLogin, login, logout } from '../../controllers/user/authController.js';

const router = express.Router();

// Signup routes
router.get('/signup', loadSignup);
router.post('/signup', signup);

// OTP routes
router.get('/otp', loadOTP);
router.post('/otp', verifyOTPHandler);
router.post('/otp/resend', resendOTP);

// Login routes
router.get('/login', loadLogin);
router.post('/login', login);

// Logout route
router.get('/logout', logout);

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback with proper cache prevention
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Set user session from Google profile
    req.session.user = {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
    };

    // Prevent caching of OAuth callback redirect
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.redirect('/home');
  }
);

export default router;