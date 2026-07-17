import { findAdminByEmail, updatePassword } from '../../services/admin/authService.js';
import { sendOTP, verifyOTP } from '../../services/user/otpService.js';
import { validate } from '../../utils/validation.js';

const loadForgotPassword = (req, res) => {
  res.render('admin/auth/forgot-password', { error: null, success: null });
};

const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.render('admin/auth/forgot-password', { error: 'Email is required', success: null });
    }

    const admin = await findAdminByEmail(email.toLowerCase().trim());

    
    if (admin && admin.isActive) {
      await sendOTP(admin.email);
      req.session.resetEmailAdmin = admin.email;
      req.session.resetOtpSentAtAdmin = Date.now();
      return res.redirect('/admin/forgot-password/otp');
    }

    
    res.render('admin/auth/forgot-password', { error: null, success: 'Invalid credentials.' });
  } catch (error) {
    console.error('Admin Forgot password error:', error);
    res.render('admin/auth/forgot-password', { error: 'Something went wrong', success: null });
  }
};

const loadForgotOTP = (req, res) => {
  if (!req.session.resetEmailAdmin) {
    return res.redirect('/admin/forgot-password');
  }
  const now = Date.now();
  const otpSentAt = req.session.resetOtpSentAtAdmin || now;
  const elapsed = Math.floor((now - otpSentAt) / 1000);
  const remaining = Math.max(59 - elapsed, 0);

  res.render('admin/auth/forgot-otp', { error: null, remaining });
};

const verifyForgotOTP = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    const email = req.session.resetEmailAdmin;

    if (!email) return res.redirect('/admin/forgot-password');

    const result = verifyOTP(email, otp);

    if (!result.success) {
      const now = Date.now();
      const otpSentAt = req.session.resetOtpSentAtAdmin || now;
      const elapsed = Math.floor((now - otpSentAt) / 1000);
      const remaining = Math.max(59 - elapsed, 0);
      return res.render('admin/auth/forgot-otp', { error: result.message, remaining });
    }

    req.session.otpVerifiedAdmin = true;
    res.redirect('/admin/forgot-password/reset');

  } catch (error) {
    console.error('Admin Forgot OTP verify error:', error);
    res.render('admin/auth/forgot-otp', { error: 'Something went wrong', remaining: 0 });
  }
};

const resendForgotOTP = async (req, res) => {
  try {
    const email = req.session.resetEmailAdmin;
    if (!email) return res.status(400).json({ success: false });

    await sendOTP(email);
    req.session.resetOtpSentAtAdmin = Date.now();
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Admin Resend Forgot OTP error:', error);
    res.status(500).json({ success: false });
  }
};

const loadResetPassword = (req, res) => {
  if (!req.session.resetEmailAdmin || !req.session.otpVerifiedAdmin) {
    return res.redirect('/admin/forgot-password');
  }
  res.render('admin/auth/reset-password', { error: null });
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.resetEmailAdmin;

    if (!email || !req.session.otpVerifiedAdmin) {
      return res.redirect('/admin/forgot-password');
    }

    const validation = validate({ password: newPassword, confirmPassword }, ['password', 'confirmPassword']);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return res.render('admin/auth/reset-password', { error: firstError });
    }

    await updatePassword(email, newPassword);

    
    delete req.session.resetEmailAdmin;
    delete req.session.resetOtpSentAtAdmin;
    delete req.session.otpVerifiedAdmin;

    req.session.success = 'Password reset successfully. Please sign in.';
    res.redirect('/admin/login');

  } catch (error) {
    console.error('Admin Reset password error:', error);
    res.render('admin/auth/reset-password', { error: 'Something went wrong' });
  }
};

export {
  loadForgotPassword,
  sendForgotPasswordOTP,
  loadForgotOTP,
  verifyForgotOTP,
  resendForgotOTP,
  loadResetPassword,
  resetPassword
};
