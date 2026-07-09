import { findUserByEmail, updatePassword } from '../../services/user/authService.js';
import { sendOTP, verifyOTP } from '../../services/user/otpService.js';
import bcrypt from 'bcrypt';

const loadForgotPassword = (req, res) => {
  res.render('user/auth/forgot-password', { error: null, success: null });
};

const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.render('user/auth/forgot-password', { error: 'Email is required', success: null });
    }

    const user = await findUserByEmail(email.toLowerCase().trim());
    
    // Always show success message to prevent email enumeration, but only send OTP if user exists and is active.
    if (user && user.isActive) {
      await sendOTP(user.email);
      req.session.resetEmailUser = user.email;
      req.session.resetOtpSentAtUser = Date.now();
      return res.redirect('/forgot-password/otp');
    }

    // If user doesn't exist or is blocked, show generic message
    res.render('user/auth/forgot-password', { error: null, success: 'If an account exists, an email was sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('user/auth/forgot-password', { error: 'Something went wrong', success: null });
  }
};

const authSendForgotPasswordOTP = async (req, res) => {
  try {
    const email = req.session.user.email;
    const user = await findUserByEmail(email);
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

  res.render('user/auth/forgot-otp', { error: null, remaining });
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
      return res.render('user/auth/forgot-otp', { error: result.message, remaining });
    }

    req.session.otpVerifiedUser = true;
    res.redirect('/forgot-password/reset');

  } catch (error) {
    console.error('Forgot OTP verify error:', error);
    res.render('user/auth/forgot-otp', { error: 'Something went wrong', remaining: 0 });
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
  res.render('user/auth/reset-password', { error: null });
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.resetEmailUser;

    if (!email || !req.session.otpVerifiedUser) {
      return res.redirect('/forgot-password');
    }

    if (newPassword !== confirmPassword) {
      return res.render('user/auth/reset-password', { error: 'Passwords do not match' });
    }

    if (newPassword.length < 8 || !/[0-9!@#$%^&*]/.test(newPassword)) {
      return res.render('user/auth/reset-password', { error: 'Password does not meet requirements' });
    }

    await updatePassword(email, newPassword);

    // Clear session variables
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
    res.render('user/auth/reset-password', { error: 'Something went wrong' });
  }
};

const loadChangePassword = (req, res) => {
  res.render('user/profile/change-password', { error: null, success: null });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user.id;
    const userEmail = req.session.user.email;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render('user/profile/change-password', { error: 'All fields are required', success: null });
    }

    const user = await findUserByEmail(userEmail);
    if (!user) {
      return res.redirect('/login');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render('user/profile/change-password', { error: 'Current password is incorrect', success: null });
    }

    // Validate new password
    if (newPassword !== confirmPassword) {
      return res.render('user/profile/change-password', { error: 'New passwords do not match', success: null });
    }

    if (newPassword === currentPassword) {
      return res.render('user/profile/change-password', { error: 'New password must be different from current password', success: null });
    }

    if (newPassword.length < 8 || !/[0-9!@#$%^&*]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
      return res.render('user/profile/change-password', { error: 'Password does not meet the security requirements', success: null });
    }

    // Update password (hashing happens inside updatePassword service)
    await updatePassword(userEmail, newPassword);

    req.session.success = 'Password updated successfully.';
    res.redirect('/profile');

  } catch (error) {
    console.error('Change password error:', error);
    res.render('user/profile/change-password', { error: 'Something went wrong', success: null });
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
