export const rules = {
  fullName: (value) => {
    if (!value || value.trim().length < 3 || value.trim().length > 50) {
      return 'Full name must be between 3 and 50 characters';
    }
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
      return 'Full name can only contain letters and spaces';
    }
    if (/\s{2,}/.test(value.trim())) {
      return 'Multiple consecutive spaces are not allowed';
    }
    return null;
  },

  terms: (value) => {
    if (value !== 'on' && value !== true && value !== 'true') {
      return 'You must accept the Terms and Conditions and Privacy Policy';
    }
    return null;
  },

  email: (value) => {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value) => {
    if (!value || !/^\d{10}$/.test(value.trim())) {
      return 'Please enter a valid phone number (exactly 10 digits)';
    }
    return null;
  },

  password: (value) => {
    if (!value || value.length < 8 || value.length > 20) {
      return 'Password must be between 8 and 20 characters';
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[0-9])/.test(value)) {
      return 'Password must contain at least one number';
    }
    if (!/(?=.*[!@#$%^&*()_+=\-{}\[\]:;"'<>,.?/|\\])/.test(value)) {
      return 'Password must contain at least one special character';
    }
    if (/\s/.test(value)) {
      return 'Password cannot contain spaces';
    }
    return null;
  },

  confirmPassword: (value, data) => {
    if (!value) return 'Please confirm your password';
    if (value !== data.password && value !== data.newPassword) {
      return 'Passwords do not match';
    }
    return null;
  },

  addressLine1: (value) => {
    if (!value || value.trim().length < 5) {
      return 'Address must be at least 5 characters long';
    }
    return null;
  },

  landmark: (value) => {
    if (value && value.trim().length > 100) {
      return 'Landmark is too long';
    }
    return null;
  },

  city: (value) => {
    if (!value || value.trim().length < 2) {
      return 'City is required';
    }
    if (!/^[a-zA-Z\s\-\']+$/.test(value.trim())) {
      return 'City can only contain letters and spaces';
    }
    return null;
  },

  state: (value) => {
    if (!value || value.trim() === '') {
      return 'Please select a state';
    }
    return null;
  },

  country: (value) => {
    if (!value || value.trim() === '') {
      return 'Please select a country';
    }
    return null;
  },

  pincode: (value) => {
    if (!value || !/^\d{6}$/.test(value.trim())) {
      return 'Pincode must be exactly 6 digits';
    }
    return null;
  }
};

/**
 * Validates an object of data against the specified fields
 * @param {Object} data - The data to validate (e.g. req.body)
 * @param {Array} fieldsToValidate - Array of field names to validate
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validate = (data, fieldsToValidate) => {
  const errors = {};

  fieldsToValidate.forEach((field) => {
    if (rules[field]) {
      const error = rules[field](data[field], data);
      if (error) {
        errors[field] = error;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};


export const isValidPhone = (phone) => {
  return rules.phone(phone) === null;
};