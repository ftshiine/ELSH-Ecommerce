import User from '../../models/User.js';
import bcrypt from 'bcrypt';

const findAdminByEmail = async (email) => {
  return await User.findOne({ email, role: 'admin' });
};

const verifyPassword = async (enteredPassword, storedPassword) => {
  return await bcrypt.compare(enteredPassword, storedPassword);
};

export { findAdminByEmail, verifyPassword };