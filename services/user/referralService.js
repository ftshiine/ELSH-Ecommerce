import User from '../../models/User.js';
import Order from '../../models/Order.js';
import { creditWallet } from './walletService.js';

export const processEligibleReferralBonuses = async () => {
    const eligibleUsers = await User.find({
        referredBy: { $exists: true, $ne: null },
        referralBonusPaid: false,
        isActive: true
    });

    let processedCount = 0;

    for (const user of eligibleUsers) {
        // Find their first completed order
        const firstOrder = await Order.findOne({ user: user._id })
            .sort({ createdAt: 1 });

        if (!firstOrder) continue;

        if (firstOrder.orderStatus === 'DELIVERED') {
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

                // 1. Credit Referrer (100)
                const referrer = await User.findById(user.referredBy);
                if (referrer && referrer.isActive) {
                    await creditWallet(
                        referrer._id,
                        100,
                        `Referral Bonus for referring ${user.fullName}`
                    );
                }

                // 2. Credit Referee (50)
                await creditWallet(
                    user._id,
                    50,
                    'Referral Sign-up Bonus'
                );

                // 3. Mark bonus as paid
                user.referralBonusPaid = true;
                await user.save();
                processedCount++;
            }
        }
    }

    return processedCount;
};
