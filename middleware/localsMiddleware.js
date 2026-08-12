export const setLocals = (req, res, next) => {
  // Flash messages
  res.locals.success = req.session.success || res.locals.success || null;
  res.locals.error = req.session.error || res.locals.error || null;
  delete req.session.success;
  delete req.session.error;

  // Global user/admin state for EJS templates
  res.locals.admin = req.session.admin || null;
  res.locals.user = req.session.user || null;
  
  next();
};
