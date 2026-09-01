import cron from 'node-cron';
import { processEligibleReferralBonuses } from '../services/user/referralService.js';

export const initReferralCron = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running Referral Bonus Check...');
    try {
      const processed = await processEligibleReferralBonuses();
      console.log(`[CRON] Referral Bonus Check Completed. Processed ${processed} bonuses.`);
    } catch (error) {
      console.error('[CRON] Error during Referral Bonus Check:', error);
    }
  });
};
