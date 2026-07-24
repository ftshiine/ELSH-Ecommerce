import { findAdminByEmail, verifyPassword } from '../../services/admin/authService.js';
import { validate } from '../../utils/validation.js';

const loadLogin = (req, res) => {
  res.render('admin/auth/login', { error: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const validationRes = validate(req.body, ['email']);
    if (!password || password.trim().length === 0) {
      if (!validationRes.errors) validationRes.errors = {};
      validationRes.errors.password = 'Password is required';
      validationRes.isValid = false;
    }

    if (!validationRes.isValid) {
      const firstError = Object.values(validationRes.errors)[0];
      return res.redirectWithState('/admin/login', { error: firstError });
    }

    const admin = await findAdminByEmail(email);
    if (!admin) {
      return res.redirectWithState('/admin/login', { error: 'Invalid email or password' });
    }

    const isMatch = await verifyPassword(password, admin.password);
    if (!isMatch) {
      return res.redirectWithState('/admin/login', { error: 'Invalid email or password' });
    }

    req.session.admin = {
      id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
    };

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    res.redirectWithState('/admin/login', { error: 'Something went wrong' });
  }
};

const logout = (req, res) => {
  if (req.session) {
   
    delete req.session.admin;

   
    if (!req.session.user && !req.session.passport) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error during admin logout:', err);
        res.clearCookie('connect.sid');
        return res.redirect('/admin/login');
      });
    } else {
      
      req.session.save(() => {
        return res.redirect('/admin/login');
      });
    }
  } else {
    res.redirect('/admin/login');
  }
};

export { loadLogin,login, logout };