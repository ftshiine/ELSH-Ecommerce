import { getAllUsers, toggleBlockUser } from '../../services/admin/userService.js';

const loadUsers = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const { users, totalUsers, totalPages } = await getAllUsers(search, page, limit);

    res.render('admin/users/index', {
      users,
      totalUsers,
      totalPages,
      currentPage: page,
      search,
      admin: req.session.admin,
      activePage: 'users',
    });
  } catch (error) {
    console.error('Load users error:', error);
    res.redirect('/admin/dashboard');
  }
};

const blockUnblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const search = req.query.search || '';
    const page = req.query.page || 1;

    await toggleBlockUser(userId);

    res.redirect(`/admin/users?page=${page}&search=${search}`);
  } catch (error) {
    console.error('Block/Unblock error:', error);
    res.redirect('/admin/users');
  }
};

export { loadUsers, blockUnblockUser };