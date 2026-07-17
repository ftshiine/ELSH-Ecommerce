const loadDashboard = (req, res) => {
  res.render('admin/dashboard/index', { admin: req.session.admin, activePage: 'dashboard' });
};

export { loadDashboard };