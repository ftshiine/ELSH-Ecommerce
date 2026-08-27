import Offer from '../../models/Offer.js';
import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { updateProductOfferPrices } from '../../utils/offerHelper.js';

export const loadOffers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Update statuses before fetching
    const allOffers = await Offer.find();
    for (const offer of allOffers) {
      // Trigger pre-save middleware to update status
      await offer.save();
    }

    const activeOffers = await Offer.find({ status: 'ACTIVE' })
      .populate('targetProducts', 'name images variants pricing')
      .populate('targetCategories', 'name')
      .sort({ createdAt: -1 });

    const scheduledDraftOffers = await Offer.find({
      status: { $in: ['SCHEDULED', 'DRAFT'] }
    })
      .populate('targetProducts', 'name images')
      .populate('targetCategories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalScheduledDraft = await Offer.countDocuments({
      status: { $in: ['SCHEDULED', 'DRAFT'] }
    });
    const totalPages = Math.ceil(totalScheduledDraft / limit);

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
    res.status(500).render('admin/500');
  }
};

export const loadCreateOffer = async (req, res) => {
  try {
    const products = await Product.find({ isListed: true, isBlocked: { $ne: true } })
      .select('name variants');

    const categories = await Category.find({ isListed: true, isDeleted: false });

    res.render('admin/offer/create', {
      title: 'Create New Campaign',
      activePage: 'offers',
      products,
      categories
    });
  } catch (error) {
    console.error('Error loading create offer page:', error);
    res.status(500).render('admin/500');
  }
};

export const createOffer = async (req, res) => {
  try {
    console.log('Received createOffer request with body:', req.body);
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

    // Backend Validations
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

    const newOffer = new Offer({
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
    });

    await newOffer.save();
    // Recalculate offers asynchronously
    updateProductOfferPrices();

    return res.json({ success: true, message: 'Offer created successfully.' });
  } catch (error) {
    console.error('Error creating offer:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const loadEditOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).render('admin/404');
    }

    const products = await Product.find({ isListed: true, isBlocked: { $ne: true } })
      .select('name variants');
    const categories = await Category.find({ isListed: true, isDeleted: false });

    res.render('admin/offer/edit', {
      title: 'Edit Campaign',
      activePage: 'offers',
      offer,
      products,
      categories
    });
  } catch (error) {
    console.error('Error loading edit offer page:', error);
    res.status(500).render('admin/500');
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

    const updatedOffer = await Offer.findByIdAndUpdate(offerId, {
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
    }, { new: true });

    if (!updatedOffer) {
      throw new Error('Offer not found.');
    }

    updateProductOfferPrices();
    return res.json({ success: true, message: 'Offer updated successfully.' });
  } catch (error) {
    console.error('Error updating offer:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    // Recalculate offers asynchronously
    updateProductOfferPrices();

    res.json({ success: true, message: `Offer ${offer.isActive ? 'activated' : 'paused'} successfully.` });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
