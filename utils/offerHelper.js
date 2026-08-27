import Product from '../models/Product.js';
import Offer from '../models/Offer.js';
import mongoose from 'mongoose';

// Updates the offerPrice and appliedOffer fields for all products

export const updateProductOfferPrices = async () => {
    try {
        console.log('Running updateProductOfferPrices...');


        const activeOffers = await Offer.find({ status: 'ACTIVE', isActive: true });


        const productOffers = activeOffers.filter(o => o.targetType === 'product');
        const categoryOffers = activeOffers.filter(o => o.targetType === 'category');
        const variantOffers = activeOffers.filter(o => o.targetType === 'variant');


        const products = await Product.find({});


        for (const product of products) {
            let productModified = false;


            const applicableCategoryOffers = categoryOffers.filter(offer =>
                offer.targetCategories.some(catId => catId.toString() === product.category.toString())
            );

            const applicableProductOffers = productOffers.filter(offer =>
                offer.targetProducts.some(prodId => prodId.toString() === product._id.toString())
            );

            for (let i = 0; i < product.variants.length; i++) {
                const variant = product.variants[i];

                const applicableVariantOffers = variantOffers.filter(offer =>
                    offer.targetVariants.some(varId => varId.toString() === variant._id.toString())
                );

                const allApplicableOffers = [
                    ...applicableCategoryOffers,
                    ...applicableProductOffers,
                    ...applicableVariantOffers
                ];

                let bestDiscountAmount = 0;
                let bestOffer = null;

                const basePrice = variant.regularPrice;

                for (const offer of allApplicableOffers) {
                    let discountAmount = 0;
                    if (offer.discountType === 'percentage') {
                        discountAmount = Math.ceil((basePrice * offer.discountValue) / 100);
                    } else if (offer.discountType === 'fixed') {
                        discountAmount = offer.discountValue;
                    }

                    if (discountAmount > bestDiscountAmount) {
                        bestDiscountAmount = discountAmount;
                        bestOffer = offer;
                    }
                }

                let finalOfferPrice = null;
                let finalAppliedOffer = null;

                if (bestOffer && bestDiscountAmount > 0) {
                    finalOfferPrice = Math.max(0, basePrice - bestDiscountAmount);
                    finalAppliedOffer = bestOffer._id;
                }


                const currentOfferPrice = variant.offerPrice;
                const currentAppliedOffer = variant.appliedOffer ? variant.appliedOffer.toString() : null;
                const newAppliedOfferStr = finalAppliedOffer ? finalAppliedOffer.toString() : null;

                if (currentOfferPrice !== finalOfferPrice || currentAppliedOffer !== newAppliedOfferStr) {
                    variant.offerPrice = finalOfferPrice;
                    variant.appliedOffer = finalAppliedOffer;
                    productModified = true;
                }
            }

            if (productModified) {
                await product.save();
            }
        }

        console.log('updateProductOfferPrices completed successfully.');
    } catch (error) {
        console.error('Error in updateProductOfferPrices:', error);
    }
};
