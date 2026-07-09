import express from 'express';
import passport from 'passport';
import { loadSignup, signup, loadOTP, verifyOTPHandler, resendOTP, loadLogin, login, logout } from '../../controllers/user/authController.js';
import { isUserLoggedIn, isUserLoggedOut } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Signup routes
router.get('/signup', isUserLoggedOut, loadSignup);
router.post('/signup', isUserLoggedOut, signup);

// OTP routes
router.get('/otp', isUserLoggedOut, loadOTP);
router.post('/otp', isUserLoggedOut, verifyOTPHandler);
router.post('/otp/resend', isUserLoggedOut, resendOTP);

// Login routes
router.get('/login', isUserLoggedOut, loadLogin);
router.post('/login', isUserLoggedOut, login);

// Logout route
router.get('/logout', isUserLoggedIn, logout);

// Google OAuth routes
router.get('/auth/google', isUserLoggedOut, passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback with proper cache prevention
router.get('/auth/google/callback',
  isUserLoggedOut,
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Set user session from Google profile
    req.session.user = {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
    };



    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authenticating...</title>
        <script>
          if (window.opener && !window.opener.closed) {
            window.opener.location.href = '/home';
            window.close();
          } else {
            window.location.replace('/home');
          }
        </script>
        <noscript>
          <meta http-equiv="refresh" content="0;url=/home">
        </noscript>
      </head>
      <body></body>
      </html>
    `);
  }
);

export default router;