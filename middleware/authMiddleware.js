const requireAuth = (role) => (req, res, next) => {
  const sessionUser = role === 'admin' ? req.session.admin : req.session.user;
  const redirectUrl = role === 'admin' ? '/admin/login' : '/login';

  if (sessionUser) {
    return next();
  }
  return res.redirect(redirectUrl);
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