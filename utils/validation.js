const validateSignup = (data) => {
  const { fullName, username, email, phone, password, confirmPassword } = data;
  const errors = [];

  // Full Name — only letters and spaces, 2-50 chars
  if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 50) {
    errors.push('Full name must be between 2 and 50 characters');
  } else if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
    errors.push('Full name can only contain letters and spaces');
  }

  // Username — only letters, numbers, underscores, 3-20 chars
  if (!username || username.trim().length < 3 || username.trim().length > 20) {
    errors.push('Username must be between 3 and 20 characters');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    errors.push('Username can only contain letters, numbers and underscores');
  }

  // Email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Please enter a valid email address');
  }

  // Phone — 10 digits, optional country code
  if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.trim().replace(/\s/g, ''))) {
    errors.push('Please enter a valid phone number (10-15 digits)');
  }

  // Password — min 8 chars, at least 1 uppercase, 1 number, 1 special char
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (!/(?=.*[0-9])/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (!/(?=.*[!@#$%^&*])/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  // Confirm Password
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  return errors;
};

const validateLogin = (data) => {
  const {email, password} = data;
  const errors = [];

  //Email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Please enter a valid email address');
  }

  // Password
  if (!password || password.trim().length === 0) {
    errors.push('Password is required');
  }

  return errors;

}

export { validateSignup, validateLogin };