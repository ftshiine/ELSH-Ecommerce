import { findAdminByEmail, verifyPassword } from '../../services/admin/authService.js';

const loadLogin = (req, res) => {
  res.render('admin/auth/login', { error: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await findAdminByEmail(email);
    if (!admin) {
      return res.render('admin/auth/login', { error: 'Invalid email or password' });
    }

    const isMatch = await verifyPassword(password, admin.password);
    if (!isMatch) {
      return res.render('admin/auth/login', { error: 'Invalid email or password' });
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
    res.render('admin/auth/login', { error: 'Something went wrong' });
  }
};

const logout = (req, res) => {
  if (req.session) {
    // Delete only the Admin session state
    delete req.session.admin;

    // If no User session exists, it's safe to destroy the entire session
    if (!req.session.user && !req.session.passport) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error during admin logout:', err);
        res.clearCookie('connect.sid');
        return res.redirect('/admin/login');
      });
    } else {
      // User is still logged in, so just save the modified session
      req.session.save(() => {
        return res.redirect('/admin/login');
      });
    }
  } else {
    res.redirect('/admin/login');
  }
};

export { loadLogin, login, logout };