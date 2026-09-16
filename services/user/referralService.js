import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Settings from '../../models/Settings.js';
import Coupon from '../../models/Coupon.js';
import { creditWallet } from './walletService.js';

export const processUserReferralBonus = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.isActive || !user.referredBy || user.referralBonusPaid) {
            return false;
        }

        // Find their first completed order
        const firstOrder = await Order.findOne({ user: user._id })
            .sort({ createdAt: 1 });

        if (!firstOrder || firstOrder.orderStatus !== 'DELIVERED') return false;

        // Find the max return window among items (usually 7 days)
        let maxReturnDays = 7;
        if (firstOrder.items && firstOrder.items.length > 0) {
            maxReturnDays = Math.max(...firstOrder.items.map(item => item.returnWindowDays || 7));
        }

        const deliveredAt = firstOrder.deliveredAt || firstOrder.updatedAt;
        const returnExpiryDate = new Date(deliveredAt);
        returnExpiryDate.setDate(returnExpiryDate.getDate() + maxReturnDays);

        const now = new Date();

        if (now > returnExpiryDate) {
            console.log(`[REFERRAL SERVICE] Unlocking referral bonus for user ${user._id} and referrer ${user.referredBy}`);

            // Fetch dynamic settings
            const settings = await Settings.findOne()
                .populate('referralCouponReferrer')
                .populate('referralCouponReferee');

            const defaultSettings = settings || { referralRewardType: 'WALLET', referralRewardReferrer: 100, referralRewardReferee: 50 };

            if (defaultSettings.referralRewardType === 'COUPON') {
                const nowTime = new Date();
                const oneMonthLater = new Date(nowTime);
                oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

                // 1. Give Coupon to Referrer
                const referrer = await User.findById(user.referredBy);
                if (referrer && referrer.isActive && defaultSettings.referralCouponReferrer) {
                    const template = defaultSettings.referralCouponReferrer;
                    await Coupon.create({
                        code: `REF-${referrer._id.toString().slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                        title: template.title || `Referral Bonus for referring ${user.fullName}`,
                        description: template.description || 'A special discount coupon for successfully referring a friend.',
                        discountType: template.discountType,
                        discountValue: template.discountValue,
                        minPurchaseAmount: template.minPurchaseAmount || 0,
                        maxDiscountLimit: template.maxDiscountLimit,
                        startDate: nowTime,
                        endDate: oneMonthLater,
                        usageLimit: 1,
                        limitPerUser: true,
                        targetUserId: referrer._id
                    });
                }

                // 2. Give Coupon to Referee
                if (defaultSettings.referralCouponReferee) {
                    const template = defaultSettings.referralCouponReferee;
                    await Coupon.create({
                        code: `REF-${user._id.toString().slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                        title: template.title || 'Referral Sign-up Bonus',
                        description: template.description || 'Your special welcome discount coupon for signing up via referral.',
                        discountType: template.discountType,
                        discountValue: template.discountValue,
                        minPurchaseAmount: template.minPurchaseAmount || 0,
                        maxDiscountLimit: template.maxDiscountLimit,
                        startDate: nowTime,
                        endDate: oneMonthLater,
                        usageLimit: 1,
                        limitPerUser: true,
                        targetUserId: user._id
                    });
                }
            } else {
                // 1. Credit Referrer
                const referrer = await User.findById(user.referredBy);
                if (referrer && referrer.isActive) {
                    await creditWallet(
                        referrer._id,
                        defaultSettings.referralRewardReferrer || 100,
                        `Referral Bonus for referring ${user.fullName}`
                    );
                }

                // 2. Credit Referee
                await creditWallet(
                    user._id,
                    defaultSettings.referralRewardReferee || 50,
                    'Referral Sign-up Bonus'
                );
            }

            // 3. Mark bonus as paid
            user.referralBonusPaid = true;
            await user.save();
            return true;
        }
        return false;
    } catch (error) {
        console.error('[REFERRAL SERVICE] Error processing referral bonus:', error);
        return false;
    }
};
