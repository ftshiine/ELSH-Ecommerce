const noCache = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

const isAdminLoggedIn = (req, res, next) => {
  noCache(req, res);
  if (req.session.admin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

const isAdminLoggedOut = (req, res, next) => {
  noCache(req, res);
  if (!req.session.admin) {
    next();
  } else {
    res.redirect('/admin/dashboard');
  }
};

export { isAdminLoggedIn, isAdminLoggedOut };