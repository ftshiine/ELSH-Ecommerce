import { getAddressesByUser, getAddressById, createAddress, updateAddress, deleteAddress, setPrimaryAddress } from '../../services/user/addressService.js';
import { validate } from '../../utils/validation.js';

export const loadAddresses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const { addresses, totalAddresses, totalPages } = await getAddressesByUser(req.session.user.id, page, limit);

    const breadcrumbs = [
      { name: 'Home', url: '/home' },
      { name: 'My Profile', url: '/profile' },
      { name: 'Ritual Sites', url: '/profile/addresses' }
    ];

    res.render('user/profile/addresses/index', {
      addresses,
      currentPage: page,
      totalPages,
      totalAddresses,
      breadcrumbs
    });
  } catch (error) {
    console.error('Load addresses error:', error);
    res.redirect('/profile');
  }
};

export const loadAddAddress = (req, res) => {
  const breadcrumbs = [
    { name: 'Home', url: '/home' },
    { name: 'My Profile', url: '/profile' },
    { name: 'Ritual Sites', url: '/profile/addresses' },
    { name: 'Add New', url: '/profile/addresses/add' }
  ];
  res.render('user/profile/addresses/form', { address: null, breadcrumbs, returnTo: req.query.returnTo });
};

export const addAddress = async (req, res) => {
  try {
    const { fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary } = req.body;

    const validation = validate(req.body, ['fullName', 'username', 'phone', 'addressLine1', 'landmark', 'country', 'city', 'state', 'pincode']);

    if (!validation.isValid) {
      const returnUrl = req.query.returnTo ? `?returnTo=${req.query.returnTo}` : '';
      return res.redirectWithState('/profile/addresses/add' + returnUrl, {
        error: 'Please correct the highlighted fields.',
        fieldErrors: validation.errors
      });
    }

    await createAddress(req.session.user.id, {
      fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary: isPrimary === 'on'
    });

    req.session.success = 'Address added successfully.';
    req.session.save(() => {
      res.redirect(req.query.returnTo || '/profile/addresses');
    });
  } catch (error) {
    console.error('Add address error:', error);

    res.redirectWithState('/profile/addresses/add', { error: 'Failed to add address.' });
  }
};

export const loadEditAddress = async (req, res) => {
  try {
    const address = await getAddressById(req.params.id, req.session.user.id);
    if (!address) return res.redirect('/profile/addresses');

    const breadcrumbs = [
      { name: 'Home', url: '/home' },
      { name: 'My Profile', url: '/profile' },
      { name: 'Ritual Sites', url: '/profile/addresses' },
      { name: 'Edit', url: `/profile/addresses/edit/${address._id}` }
    ];
    res.render('user/profile/addresses/form', { address, breadcrumbs, returnTo: req.query.returnTo });
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
      const returnUrl = req.query.returnTo ? `?returnTo=${req.query.returnTo}` : '';
      return res.redirectWithState(`/profile/addresses/edit/${req.params.id}` + returnUrl, {
        error: 'Please correct the highlighted fields.',
        fieldErrors: validation.errors
      });
    }

    await updateAddress(req.params.id, req.session.user.id, {
      fullName, phone, addressLine1, landmark, country, city, state, pincode, isPrimary: isPrimary === 'on'
    });

    req.session.success = 'Address updated successfully.';
    req.session.save(() => {
      res.redirect(req.query.returnTo || '/profile/addresses');
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

