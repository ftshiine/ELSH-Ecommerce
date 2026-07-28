/**
 * Centralized Form Validator for Admin Dashboard
 * Handles inline error UI logic similar to the User Auth forms.
 */

window.AdminValidator = {
  rules: {
    categoryName: function(value) {
      if (!value || value.trim().length < 3 || value.trim().length > 50) {
        return 'Name must be between 3 and 50 characters.';
      }
      if (!/^[a-zA-Z0-9\s\-]+$/.test(value.trim())) {
        return 'Name can only contain letters, numbers, spaces, and hyphens.';
      }
      return null;
    },
    
    productName: function(value) {
      if (!value || value.trim().length < 3 || value.trim().length > 100) {
        return 'Name must be between 3 and 100 characters.';
      }
      if (!/^[a-zA-Z0-9\s\-\.,&]+$/.test(value.trim())) {
        return 'Name contains invalid characters.';
      }
      return null;
    },

    description: function(value) {
      if (!value || value.trim().length < 10 || value.trim().length > 500) {
        return 'Description must be between 10 and 500 characters.';
      }
      return null;
    },

    price: function(value) {
      const price = parseFloat(value);
      if (isNaN(price) || price < 0) {
        return 'Price must be a valid positive number.';
      }
      return null;
    },

    salePrice: function(value, data) {
      if (value === '' || value === null || value === undefined) return null; // Optional
      const sPrice = parseFloat(value);
      const rPrice = parseFloat(data.regularPrice);
      if (isNaN(sPrice) || sPrice < 0) {
        return 'Sale price must be a valid positive number.';
      }
      if (!isNaN(rPrice) && sPrice >= rPrice) {
        return 'Sale price must be strictly less than Regular Price.';
      }
      return null;
    },

    stock: function(value) {
      const stock = parseInt(value, 10);
      if (isNaN(stock) || stock < 0 || stock.toString() !== value.trim()) {
        return 'Stock must be a valid positive integer.';
      }
      return null;
    }
  },

  /**
   * Validates the form based on provided fields and their corresponding rules.
   * @param {HTMLElement} formElement - The form to validate
   * @param {Object} fieldMapping - Object mapping input name attributes to rule names (e.g. { name: 'categoryName' })
   * @returns {boolean} - true if valid, false if there are errors
   */
  validateForm: function(formElement, fieldMapping) {
    let isValid = true;
    const data = {};

    // Gather data
    Object.keys(fieldMapping).forEach(inputName => {
      const input = formElement.querySelector(`[name="${inputName}"]`);
      if (input) {
        data[inputName] = input.value;
      }
    });

    // Clear previous dynamic errors
    formElement.querySelectorAll('.field-error-dynamic').forEach(el => el.remove());
    formElement.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    // Validate fields
    Object.keys(fieldMapping).forEach(inputName => {
      const ruleName = fieldMapping[inputName];
      const input = formElement.querySelector(`[name="${inputName}"]`);
      if (!input) return;

      let error = null;
      if (this.rules[ruleName]) {
        error = this.rules[ruleName](data[inputName], data);
      }

      if (error) {
        isValid = false;
        
        // Find wrapper
        const wrapper = input.closest('.input-wrapper') || input;
        if (wrapper) {
          wrapper.classList.add('has-error');
          
          const errDiv = document.createElement('div');
          errDiv.className = 'field-error field-error-dynamic';
          errDiv.textContent = error;
          wrapper.parentNode.insertBefore(errDiv, wrapper.nextSibling);
        }
      }
    });

    return isValid;
  },
  
  /**
   * Manually adds an error to a specific DOM element wrapper (useful for non-standard inputs like image grids)
   */
  addCustomError: function(wrapperElement, errorMessage) {
    if (!wrapperElement) return;
    wrapperElement.classList.add('has-error');
    
    // Remove existing custom error if present
    const existing = wrapperElement.parentNode.querySelector('.custom-error-dynamic');
    if (existing) existing.remove();

    const errDiv = document.createElement('div');
    errDiv.className = 'field-error field-error-dynamic custom-error-dynamic';
    errDiv.textContent = errorMessage;
    wrapperElement.parentNode.insertBefore(errDiv, wrapperElement.nextSibling);
  }
};
