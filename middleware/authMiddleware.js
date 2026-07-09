const isAdminLoggedIn = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

const isAdminLoggedOut = (req, res, next) => {
  if (!req.session.admin) {
    next();
  } else {
    res.redirect('/admin/dashboard');
  }
};

const isUserLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

const isUserLoggedOut = (req, res, next) => {
  if (!req.session.user) {
    next();
  } else {
    res.redirect('/home');
  }
};

export { isAdminLoggedIn, isAdminLoggedOut, isUserLoggedIn, isUserLoggedOut };