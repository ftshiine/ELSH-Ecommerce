import User from '../../models/User.js';
import bcrypt from 'bcrypt';

const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};

const findUserByUsername = async (username) => {
  return await User.findOne({ username });
};

const createUser = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = new User({
    fullName: userData.fullName,
    username: userData.username,
    email: userData.email,
    phone: userData.phone,
    password: hashedPassword,
    role: 'user',
    isActive: true,
  });
  return await user.save();
};

export { findUserByEmail, findUserByUsername, createUser };