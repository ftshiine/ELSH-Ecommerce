import { getAddressesByUser, getAddressById, createAddress, updateAddress, deleteAddress, setPrimaryAddress } from '../../services/user/addressService.js';
import { validate } from '../../utils/validation.js';

export const loadAddresses = async (req, res) => {
  try {
    const addresses = await getAddressesByUser(req.session.user.id);
    res.render('user/profile/addresses/index', { addresses });
  } catch (error) {
    console.error('Load addresses error:', error);
    res.redirect('/profile');
  }
};

export const loadAddAddress = (req, res) => {
  res.render('user/profile/addresses/form', { address: null });
};

export const addAddress = async (req, res) => {
  try {
    const { fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary } = req.body;

    const validation = validate(req.body, ['fullName', 'phone', 'addressLine1', 'landmark', 'country', 'city', 'state', 'pincode']);

    if (!validation.isValid) {
      return res.render('user/profile/addresses/form', {
        address: null,
        error: 'Please correct the highlighted fields.',
        fieldErrors: validation.errors
      });
    }

    await createAddress(req.session.user.id, {
      fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary: isPrimary === 'on'
    });

    req.session.success = 'Address added successfully.';
    req.session.save(() => {
      res.redirect('/profile/addresses');
    });
  } catch (error) {
    console.error('Add address error:', error);
    
    res.render('user/profile/addresses/form', { address: null, error: 'Failed to add address.' });
  }
};

export const loadEditAddress = async (req, res) => {
  try {
    const address = await getAddressById(req.params.id, req.session.user.id);
    if (!address) return res.redirect('/profile/addresses');

    res.render('user/profile/addresses/form', { address });
  } catch (error) {
    console.error('Load edit address error:', error);
    res.redirect('/profile/addresses');
  }
};

export const editAddress = async (req, res) => {
  try {
    const { fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary } = req.body;

    const validation = validate(req.body, ['fullName', 'phone', 'addressLine1', 'landmark', 'country', 'city', 'state', 'pincode']);

    if (!validation.isValid) {
      return res.render('user/profile/addresses/form', {
        address: { _id: req.params.id },
        error: 'Please correct the highlighted fields.',
        fieldErrors: validation.errors
      });
    }

    await updateAddress(req.params.id, req.session.user.id, {
      fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary: isPrimary === 'on'
    });

    req.session.success = 'Address updated successfully.';
    req.session.save(() => {
      res.redirect('/profile/addresses');
    });
  } catch (error) {
    console.error('Edit address error:', error);
    res.redirect('/profile/addresses');
  }
};

export const removeAddress = async (req, res) => {
  try {
    await deleteAddress(req.params.id, req.session.user.id);
    req.session.success = 'Address removed successfully.';
    req.session.save(() => {
      res.redirect('/profile/addresses');
    });
  } catch (error) {
    console.error('Remove address error:', error);
    res.redirect('/profile/addresses');
  }
};

export const makePrimary = async (req, res) => {
  try {
    await setPrimaryAddress(req.params.id, req.session.user.id);
    req.session.success = 'Primary address updated successfully.';
    req.session.save(() => {
      res.redirect('/profile/addresses');
    });
  } catch (error) {
    console.error('Make primary error:', error);
    res.redirect('/profile/addresses');
  }
};
