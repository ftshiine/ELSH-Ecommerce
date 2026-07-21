

window.ELSHValidator = {
  rules: {
    terms: function(value, data) {
      if (!data.termsChecked) {
        return 'You must accept the Terms and Conditions and Privacy Policy';
      }
      return null;
    },

    fullName: function(value) {
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
  
    email: function(value) {
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        return 'Please enter a valid email address';
      }
      return null;
    },
  
    phone: function(value) {
      if (!value || !/^\d{10}$/.test(value.trim())) {
        return 'Please enter a valid phone number (exactly 10 digits)';
      }
      return null;
    },
  
    password: function(value) {
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
    
    newPassword: function(value) {
      return this.password(value);
    },
  
    confirmPassword: function(value, data) {
      if (!value) return 'Please confirm your password';
      if (value !== data.password && value !== data.newPassword) {
        return 'Passwords do not match';
      }
      return null;
    },
  
    addressLine1: function(value) {
      if (!value || value.trim().length < 5) {
        return 'Address must be at least 5 characters long';
      }
      return null;
    },
  
    landmark: function(value) {
      if (value && value.trim().length > 100) {
        return 'Landmark is too long';
      }
      return null;
    },
  
    city: function(value) {
      if (!value || value.trim().length < 2) {
        return 'City is required';
      }
      if (!/^[a-zA-Z\s\-\']+$/.test(value.trim())) {
        return 'City can only contain letters and spaces';
      }
      return null;
    },
  
    state: function(value) {
      if (!value || value.trim() === '') {
        return 'Please select a state';
      }
      return null;
    },
  
    country: function(value) {
      if (!value || value.trim() === '') {
        return 'Please select a country';
      }
      return null;
    },
  
    pincode: function(value) {
      if (!value || !/^\d{6}$/.test(value.trim())) {
        return 'Pincode must be exactly 6 digits';
      }
      return null;
    }
  },


  validateForm: function(formElement, fieldsToValidate) {
    let isValid = true;
    const data = {};
    
    // Gather data
    fieldsToValidate.forEach(field => {
      const input = formElement.querySelector(`[name="${field}"]`);
      if (input) {
        data[field] = input.value;
        if (input.type === 'checkbox') {
          data[`${field}Checked`] = input.checked;
        }
      }
    });
    
   
    formElement.querySelectorAll('.field-error-dynamic').forEach(el => el.remove());
    formElement.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    
    fieldsToValidate.forEach(field => {
      const input = formElement.querySelector(`[name="${field}"]`);
      if (!input) return;
      
      let error = null;
      if (window.ELSHValidator.rules[field]) {
        error = window.ELSHValidator.rules[field](data[field], data);
      }
      
      if (error) {
        isValid = false;
        
        const wrapper = input.closest('.input-wrapper') || input.closest('.form-checkbox');
        if (wrapper) {
          wrapper.classList.add('has-error');
          
          const next = wrapper.nextElementSibling;
          if (next && next.classList.contains('field-error')) {
            next.textContent = error;
            next.style.display = 'block';
          } else {
            const errDiv = document.createElement('div');
            errDiv.className = 'field-error field-error-dynamic';
            errDiv.textContent = error;
            wrapper.parentNode.insertBefore(errDiv, wrapper.nextSibling);
          }
        }
      } else {
        const wrapper = input.closest('.input-wrapper') || input.closest('.form-checkbox');
        if (wrapper) {
          const next = wrapper.nextElementSibling;
          if (next && next.classList.contains('field-error')) {
             next.style.display = 'none';
          }
        }
      }
    });

    return isValid;
  },

  attachToForm: function(formId, fieldsToValidate) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', function(e) {
      
      const isValid = window.ELSHValidator.validateForm(form, fieldsToValidate);
      
      if (!isValid) {
        e.preventDefault();
        
        const btn = form.querySelector('button[type="submit"]');
        if (btn && btn.classList.contains('processing')) {
           btn.classList.remove('processing');
           btn.innerHTML = btn.getAttribute('data-original-text') || 'Submit';
           btn.style.opacity = '1';
           btn.style.cursor = 'pointer';
        }
      } else {
        
        const btn = form.querySelector('button[type="submit"]');
        if (btn && !btn.classList.contains('processing')) {
           btn.setAttribute('data-original-text', btn.innerHTML);
           btn.classList.add('processing');
           btn.innerHTML = 'PROCESSING...';
           btn.style.opacity = '0.7';
           btn.style.cursor = 'not-allowed';
        }
      }
    });
  }
};
