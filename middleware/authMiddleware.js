import User from '../models/User.js';
import { validateAccountStatus } from '../services/user/authService.js';

const requireAuth = (role) => async (req, res, next) => {
  const sessionUser = role === 'admin' ? req.session.admin : req.session.user;
  const redirectUrl = role === 'admin' ? '/admin/login' : '/login';

  if (!sessionUser) {
    return res.redirect(redirectUrl);
  }


  if (role === 'user') {
    try {
      const user = await User.findById(sessionUser.id);
      const validation = validateAccountStatus(user);

      if (!validation.isValid) {

        delete req.session.user;
        if (req.session.passport) {
          delete req.session.passport;
        }

        req.session.error = validation.message;

        return req.session.save(() => {
          return res.redirect('/login');
        });
      }
    } catch (error) {
      console.error('Real-time validation error:', error);
      return res.redirect('/login');
    }
  }

  return next();
};

const requireGuest = (role) => (req, res, next) => {
  const sessionUser = role === 'admin' ? req.session.admin : req.session.user;
  const redirectUrl = role === 'admin' ? '/admin/dashboard' : '/home';

  if (!sessionUser) {
    return next();
  }
  return res.redirect(redirectUrl);
};

const preventCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '-1');
  next();
};

export { requireAuth, requireGuest, preventCache };