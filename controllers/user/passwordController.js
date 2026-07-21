import { findUserByEmail, updatePassword } from '../../services/user/authService.js';
import { sendOTP, verifyOTP } from '../../services/user/otpService.js';
import { validate } from '../../utils/validation.js';
import bcrypt from 'bcrypt';

const loadForgotPassword = (req, res) => {
  res.render('user/auth/forgot-password');
};

const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.redirectWithState('/forgot-password', { error: 'Email is required' });
    }

    const user = await findUserByEmail(email.toLowerCase().trim());

    if (user && user.isActive) {
      await sendOTP(user.email);
      req.session.resetEmailUser = user.email;
      req.session.resetOtpSentAtUser = Date.now();
      return res.redirect('/forgot-password/otp');
    }
    res.redirectWithState('/forgot-password', { success: 'If an account exists, an email was sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.redirectWithState('/forgot-password', { error: 'Something went wrong' });
  }
};

const authSendForgotPasswordOTP = async (req, res) => {
  try {
    const email = req.session.user.email;
    const user = await findUserByEmail(email);

    if (user && user.googleId) {
      req.session.error = 'This account uses Google Sign-In. Your password is managed by your Google account.';
      return res.redirect('/profile');
    }

    if (user && user.isActive) {
      await sendOTP(user.email);
      req.session.resetEmailUser = user.email;
      req.session.resetOtpSentAtUser = Date.now();
      return res.redirect('/forgot-password/otp');
    }
    req.session.error = 'Unable to initiate password reset.';
    return res.redirect('/profile/change-password');
  } catch (error) {
    console.error('Authenticated forgot password error:', error);
    req.session.error = 'Something went wrong';
    res.redirect('/profile/change-password');
  }
};

const loadForgotOTP = (req, res) => {
  if (!req.session.resetEmailUser) {
    return res.redirect('/forgot-password');
  }
  const now = Date.now();
  const otpSentAt = req.session.resetOtpSentAtUser || now;
  const elapsed = Math.floor((now - otpSentAt) / 1000);
  const remaining = Math.max(59 - elapsed, 0);

  res.render('user/auth/forgot-otp', { remaining });
};

const verifyForgotOTP = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    const email = req.session.resetEmailUser;

    if (!email) return res.redirect('/forgot-password');

    const result = verifyOTP(email, otp);

    if (!result.success) {
      const now = Date.now();
      const otpSentAt = req.session.resetOtpSentAtUser || now;
      const elapsed = Math.floor((now - otpSentAt) / 1000);
      const remaining = Math.max(59 - elapsed, 0);
      return res.redirectWithState('/forgot-password/otp', { error: result.message });
    }

    req.session.otpVerifiedUser = true;
    res.redirect('/forgot-password/reset');

  } catch (error) {
    console.error('Forgot OTP verify error:', error);
    res.redirectWithState('/forgot-password/otp', { error: 'Something went wrong' });
  }
};

const resendForgotOTP = async (req, res) => {
  try {
    const email = req.session.resetEmailUser;
    if (!email) return res.status(400).json({ success: false });

    await sendOTP(email);
    req.session.resetOtpSentAtUser = Date.now();
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Resend Forgot OTP error:', error);
    res.status(500).json({ success: false });
  }
};

const loadResetPassword = (req, res) => {
  if (!req.session.resetEmailUser || !req.session.otpVerifiedUser) {
    return res.redirect('/forgot-password');
  }
  res.render('user/auth/reset-password');
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.resetEmailUser;

    if (!email || !req.session.otpVerifiedUser) {
      return res.redirect('/forgot-password');
    }

    const validation = validate({ password: newPassword, confirmPassword }, ['password', 'confirmPassword']);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return res.redirectWithState('/forgot-password/reset', { error: firstError });
    }

    await updatePassword(email, newPassword);


    delete req.session.resetEmailUser;
    delete req.session.resetOtpSentAtUser;
    delete req.session.otpVerifiedUser;

    if (req.session.user) {
      req.session.success = 'Password updated successfully.';
      res.redirect('/profile');
    } else {
      req.session.success = 'Password reset successfully. Please sign in.';
      res.redirect('/login');
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.redirectWithState('/forgot-password/reset', { error: 'Something went wrong' });
  }
};

const loadChangePassword = async (req, res) => {
  try {
    const user = await findUserByEmail(req.session.user.email);
    if (user && user.googleId) {
      req.session.error = 'This account uses Google Sign-In. Your password is managed by your Google account.';
      return res.redirect('/profile');
    }
    res.render('user/profile/change-password');
  } catch (error) {
    console.error('Load change password error:', error);
    res.redirect('/profile');
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userEmail = req.session.user.email;
    const fieldErrors = {};

    // 1. Missing Fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirectWithState('/profile/change-password', { error: 'All fields are required.' });
    }

    // 2. Password Match
    if (newPassword !== confirmPassword) {
      fieldErrors.confirmPassword = 'Passwords do not match.';
      return res.redirectWithState('/profile/change-password', { 
        error: 'Please correct the highlighted fields.', 
        fieldErrors 
      });
    }

    // 3. Password History
    if (newPassword === currentPassword) {
      fieldErrors.newPassword = 'New password must be different from current password.';
      return res.redirectWithState('/profile/change-password', { 
        error: 'Please correct the highlighted fields.', 
        fieldErrors 
      });
    }

    // 4. Password Strength
    const minLengthRegex = /.{8,}/;
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberSpecialRegex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    if (!minLengthRegex.test(newPassword)) {
      fieldErrors.newPassword = 'Password must be at least 8 characters long.';
    } else if (!uppercaseRegex.test(newPassword) || !lowercaseRegex.test(newPassword)) {
      fieldErrors.newPassword = 'Password must contain at least one uppercase and one lowercase letter.';
    } else if (!numberSpecialRegex.test(newPassword)) {
      fieldErrors.newPassword = 'Password must contain at least one number or special character.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.redirectWithState('/profile/change-password', { 
        error: 'Please correct the highlighted fields.', 
        fieldErrors 
      });
    }

    // Proceed to Database Operations
    const user = await findUserByEmail(userEmail);
    if (!user) {
      return res.redirect('/login');
    }

    if (user.googleId) {
      req.session.error = 'This account uses Google Sign-In. Password is managed by your Google account.';
      return res.redirect('/profile');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      fieldErrors.currentPassword = 'Current password is incorrect.';
      return res.redirectWithState('/profile/change-password', { 
        error: 'Please correct the highlighted fields.', 
        fieldErrors 
      });
    }

    await updatePassword(userEmail, newPassword);

    req.session.success = 'Password updated successfully.';
    res.redirect('/profile');

  } catch (error) {
    console.error('change password error:', error);
    res.redirectWithState('/profile/change-password', { error: 'Something went wrong.' });
  }
};



export {
  loadForgotPassword,
  sendForgotPasswordOTP,
  loadForgotOTP,
  verifyForgotOTP,
  resendForgotOTP,
  loadResetPassword,
  resetPassword,
  authSendForgotPasswordOTP,
  loadChangePassword,
  changePassword
};
