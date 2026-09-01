import Offer from '../../models/Offer.js';
import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { updateProductOfferPrices } from '../../utils/offerHelper.js';
import { STATUS_CODES, OFFER_MESSAGES } from '../../constants/index.js';

export const getOffersAdmin = async ({ page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;

    // Update statuses before fetching
    const allOffers = await Offer.find();
    for (const offer of allOffers) {
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

    return {
        activeOffers,
        scheduledDraftOffers,
        currentPage: page,
        totalPages
    };
};

export const getOfferFormData = async () => {
    const products = await Product.find({ isListed: true, isBlocked: { $ne: true } })
        .select('name variants');

    const categories = await Category.find({ isListed: true, isDeleted: false });

    return { products, categories };
};

export const getOfferById = async (id) => {
    return await Offer.findById(id);
};

export const createOffer = async (offerData) => {
    const newOffer = new Offer(offerData);
    await newOffer.save();
    updateProductOfferPrices();
    return newOffer;
};

export const updateOffer = async (id, updateData) => {
    const updatedOffer = await Offer.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedOffer) {
        const error = new Error(OFFER_MESSAGES.NOT_FOUND);
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }
    updateProductOfferPrices();
    return updatedOffer;
};

export const toggleOfferStatus = async (id) => {
    const offer = await Offer.findById(id);
    if (!offer) {
        const error = new Error(OFFER_MESSAGES.NOT_FOUND);
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    offer.isActive = !offer.isActive;
    await offer.save();
    updateProductOfferPrices();
    return offer;
};
