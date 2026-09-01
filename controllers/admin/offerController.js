import * as offerService from '../../services/admin/offerService.js';
import { STATUS_CODES, COMMON_MESSAGES, OFFER_MESSAGES } from '../../constants/index.js';

export const loadOffers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const {
      activeOffers,
      scheduledDraftOffers,
      totalPages
    } = await offerService.getOffersAdmin({ page, limit });

    res.render('admin/offer/index', {
      title: 'Offer Management',
      activePage: 'offers',
      activeOffers,
      scheduledDraftOffers,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error('Error loading offers:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('admin/500');
  }
};

export const loadCreateOffer = async (req, res) => {
  try {
    const { products, categories } = await offerService.getOfferFormData();

    res.render('admin/offer/create', {
      title: 'Create New Campaign',
      activePage: 'offers',
      products,
      categories
    });
  } catch (error) {
    console.error('Error loading create offer page:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('admin/500');
  }
};

export const createOffer = async (req, res) => {
  try {
    const {
      name,
      startDate,
      endDate,
      discountType,
      discountValue,
      status,
      targetType,
      targetProducts,
      targetCategories,
      targetVariants
    } = req.body;

    const parsedTargetProducts = targetProducts ? (Array.isArray(targetProducts) ? targetProducts : [targetProducts]) : [];
    const parsedTargetCategories = targetCategories ? (Array.isArray(targetCategories) ? targetCategories : [targetCategories]) : [];
    const parsedTargetVariants = targetVariants ? (Array.isArray(targetVariants) ? targetVariants : [targetVariants]) : [];

    if (!name || name.trim() === '') {
      throw new Error('Campaign name is required.');
    }
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required.');
    }
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('End date must be after or equal to the start date.');
    }
    if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) {
      throw new Error('Discount value must be a valid number greater than 0.');
    }
    if (discountType === 'percentage' && Number(discountValue) > 100) {
      throw new Error('Percentage discount cannot exceed 100%.');
    }
    if (targetType === 'product' && parsedTargetProducts.length === 0) {
      throw new Error('Please select at least one product.');
    }
    if (targetType === 'category' && parsedTargetCategories.length === 0) {
      throw new Error('Please select at least one category.');
    }
    if (targetType === 'variant' && parsedTargetVariants.length === 0) {
      throw new Error('Please select at least one variant.');
    }

    const offerData = {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      discountType,
      discountValue: Number(discountValue),
      targetType: targetType || 'product',
      targetProducts: parsedTargetProducts,
      targetCategories: parsedTargetCategories,
      targetVariants: parsedTargetVariants,
      status: status || 'ACTIVE'
    };

    await offerService.createOffer(offerData);

    return res.status(STATUS_CODES.CREATED).json({ success: true, message: OFFER_MESSAGES.CREATED_SUCCESS });
  } catch (error) {
    console.error('Error creating offer:', error.message);
    return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

export const loadEditOffer = async (req, res) => {
  try {
    const offer = await offerService.getOfferById(req.params.id);
    if (!offer) {
      return res.status(STATUS_CODES.NOT_FOUND).render('admin/404');
    }

    const { products, categories } = await offerService.getOfferFormData();

    res.render('admin/offer/edit', {
      title: 'Edit Campaign',
      activePage: 'offers',
      offer,
      products,
      categories
    });
  } catch (error) {
    console.error('Error loading edit offer page:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('admin/500');
  }
};

export const updateOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const {
      name,
      startDate,
      endDate,
      discountType,
      discountValue,
      status,
      targetType,
      targetProducts,
      targetCategories,
      targetVariants
    } = req.body;

    const parsedTargetProducts = targetProducts ? (Array.isArray(targetProducts) ? targetProducts : [targetProducts]) : [];
    const parsedTargetCategories = targetCategories ? (Array.isArray(targetCategories) ? targetCategories : [targetCategories]) : [];
    const parsedTargetVariants = targetVariants ? (Array.isArray(targetVariants) ? targetVariants : [targetVariants]) : [];

    if (!name || name.trim() === '') throw new Error('Campaign name is required.');
    if (!startDate || !endDate) throw new Error('Start date and end date are required.');
    if (new Date(startDate) > new Date(endDate)) throw new Error('End date must be after or equal to the start date.');
    if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) throw new Error('Discount value must be a valid number greater than 0.');
    if (discountType === 'percentage' && Number(discountValue) > 100) throw new Error('Percentage discount cannot exceed 100%.');

    if (targetType === 'product' && parsedTargetProducts.length === 0) throw new Error('Please select at least one product.');
    if (targetType === 'category' && parsedTargetCategories.length === 0) throw new Error('Please select at least one category.');
    if (targetType === 'variant' && parsedTargetVariants.length === 0) throw new Error('Please select at least one variant.');

    const updateData = {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      discountType,
      discountValue: Number(discountValue),
      targetType: targetType || 'product',
      targetProducts: parsedTargetProducts,
      targetCategories: parsedTargetCategories,
      targetVariants: parsedTargetVariants,
      status: status || 'ACTIVE'
    };

    await offerService.updateOffer(offerId, updateData);

    return res.status(STATUS_CODES.OK).json({ success: true, message: OFFER_MESSAGES.UPDATED_SUCCESS });
  } catch (error) {
    console.error('Error updating offer:', error.message);
    const status = error.statusCode || STATUS_CODES.BAD_REQUEST;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const toggleOfferStatus = async (req, res) => {
  try {
    const offer = await offerService.toggleOfferStatus(req.params.id);

    res.status(STATUS_CODES.OK).json({ success: true, message: `Offer ${offer.isActive ? 'activated' : 'paused'} successfully.` });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.SERVER_ERROR });
  }
};
