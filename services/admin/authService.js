import User from '../../models/User.js';
import bcrypt from 'bcrypt';

const findAdminByEmail = async (email) => {
  return await User.findOne({ email, role: 'admin' });
};

const verifyPassword = async (enteredPassword, storedPassword) => {
  return await bcrypt.compare(enteredPassword, storedPassword);
};

const updatePassword = async (email, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return await User.findOneAndUpdate({ email, role: 'admin' }, { password: hashedPassword });
};

export { findAdminByEmail, verifyPassword, updatePassword };