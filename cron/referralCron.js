import cron from 'node-cron';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';

export const initReferralCron = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running Referral Bonus Check...');
    try {
      // Find users who were referred but haven't been paid the bonus yet
      const eligibleUsers = await User.find({
        referredBy: { $exists: true, $ne: null },
        referralBonusPaid: false,
        isActive: true
      });

      for (const user of eligibleUsers) {
        // Find their first completed order
        const firstOrder = await Order.findOne({ user: user._id })
          .sort({ createdAt: 1 });

        if (!firstOrder) continue;

        if (firstOrder.orderStatus === 'DELIVERED') {
          // Check if return window has expired
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
            console.log(`[CRON] Unlocking referral bonus for user ${user._id} and referrer ${user.referredBy}`);

            // 1. Credit Referrer
            const referrer = await User.findById(user.referredBy);
            if (referrer && referrer.isActive) {
              let referrerWallet = await Wallet.findOne({ user: referrer._id });
              if (!referrerWallet) {
                referrerWallet = new Wallet({ user: referrer._id, balance: 0, transactions: [] });
              }
              referrerWallet.balance += 100;
              referrerWallet.transactions.push({
                amount: 100,
                type: 'CREDIT',
                description: `Referral Bonus for referring ${user.fullName}`,
                date: new Date()
              });
              await referrerWallet.save();
            }

            // 2. Credit Referee 
            let refereeWallet = await Wallet.findOne({ user: user._id });
            if (!refereeWallet) {
              refereeWallet = new Wallet({ user: user._id, balance: 0, transactions: [] });
            }
            refereeWallet.balance += 50;
            refereeWallet.transactions.push({
              amount: 50,
              type: 'CREDIT',
              description: `Referral Sign-up Bonus`,
              date: new Date()
            });
            await refereeWallet.save();

            // 3. Mark bonus as paid
            user.referralBonusPaid = true;
            await user.save();
          }
        }
      }
      console.log('[CRON] Referral Bonus Check Completed.');
    } catch (error) {
      console.error('[CRON] Error during Referral Bonus Check:', error);
    }
  });
};
