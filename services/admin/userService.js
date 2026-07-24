import User from '../../models/User.js';

const getAllUsers = async (search, page, limit) => {
  const query = { role: 'user' };

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const totalUsers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limit);

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return { users, totalUsers, totalPages };
};

const toggleBlockUser = async (userId) => {
  const user = await User.findById(userId);

  user.isActive = !user.isActive;
  await user.save();
  return user;
};

export { getAllUsers, toggleBlockUser };
