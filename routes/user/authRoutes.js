import express from 'express';
import passport from 'passport';
import { loadSignup, signup, loadOTP, verifyOTPHandler, resendOTP, loadLogin, login, logout } from '../../controllers/user/authController.js';

const router = express.Router();

router.get('/signup', loadSignup);
router.post('/signup', signup);
router.get('/otp', loadOTP);
router.post('/otp', verifyOTPHandler);
router.post('/otp/resend', resendOTP);
router.get('/login', loadLogin);
router.post('/login', login);
router.get('/logout', logout);

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.user = {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
    };
    res.redirect('/home');
  }
);

export default router;