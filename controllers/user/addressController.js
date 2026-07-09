import { getAddressesByUser, getAddressById, createAddress, updateAddress, deleteAddress, setPrimaryAddress } from '../../services/user/addressService.js';

export const loadAddresses = async (req, res) => {
  try {
    const addresses = await getAddressesByUser(req.session.user.id);
    res.render('user/profile/addresses/index', { addresses, error: null, success: null });
  } catch (error) {
    console.error('Load addresses error:', error);
    res.redirect('/profile');
  }
};

export const loadAddAddress = (req, res) => {
  res.render('user/profile/addresses/form', { address: null, error: null, success: null });
};

export const addAddress = async (req, res) => {
  try {
    const { fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary } = req.body;
    
    // Basic validation
    if (!fullName || !phone || !addressLine1 || !country || !city || !state || !pincode) {
      return res.render('user/profile/addresses/form', { 
        address: req.body, 
        error: 'Please fill out all required fields.', 
        success: null 
      });
    }

    if (!/^\+?[0-9]{10,15}$/.test(phone.trim().replace(/\s/g, ''))) {
      return res.render('user/profile/addresses/form', { 
        address: req.body, 
        error: 'Please enter a valid phone number', 
        success: null 
      });
    }

    await createAddress(req.session.user.id, {
      fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary: isPrimary === 'on'
    });
    
    res.redirect('/profile/addresses');
  } catch (error) {
    console.error('Add address error:', error);
    res.render('user/profile/addresses/form', { address: req.body, error: 'Failed to add address.', success: null });
  }
};

export const loadEditAddress = async (req, res) => {
  try {
    const address = await getAddressById(req.params.id, req.session.user.id);
    if (!address) return res.redirect('/profile/addresses');
    
    res.render('user/profile/addresses/form', { address, error: null, success: null });
  } catch (error) {
    console.error('Load edit address error:', error);
    res.redirect('/profile/addresses');
  }
};

export const editAddress = async (req, res) => {
  try {
    const { fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary } = req.body;

    if (!fullName || !phone || !addressLine1 || !country || !city || !state || !pincode) {
      return res.render('user/profile/addresses/form', { 
        address: { _id: req.params.id, ...req.body }, 
        error: 'Please fill out all required fields.', 
        success: null 
      });
    }

    if (!/^\+?[0-9]{10,15}$/.test(phone.trim().replace(/\s/g, ''))) {
      return res.render('user/profile/addresses/form', { 
        address: { _id: req.params.id, ...req.body }, 
        error: 'Please enter a valid phone number', 
        success: null 
      });
    }

    await updateAddress(req.params.id, req.session.user.id, {
      fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary: isPrimary === 'on'
    });
    
    res.redirect('/profile/addresses');
  } catch (error) {
    console.error('Edit address error:', error);
    res.redirect('/profile/addresses');
  }
};

export const removeAddress = async (req, res) => {
  try {
    await deleteAddress(req.params.id, req.session.user.id);
    res.redirect('/profile/addresses');
  } catch (error) {
    console.error('Remove address error:', error);
    res.redirect('/profile/addresses');
  }
};

export const makePrimary = async (req, res) => {
  try {
    await setPrimaryAddress(req.params.id, req.session.user.id);
    res.redirect('/profile/addresses');
  } catch (error) {
    console.error('Make primary error:', error);
    res.redirect('/profile/addresses');
  }
};
