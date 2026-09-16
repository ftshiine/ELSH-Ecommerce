import * as walletService from '../../services/user/walletService.js';
import * as referralService from '../../services/user/referralService.js';

export const getWallet = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    // Lazy Evaluation: Check and process pending referral bonus for this user
    await referralService.processUserReferralBonus(userId);

    const {
      wallet,
      user,
      transactions,
      totalPages,
      currentPage
    } = await walletService.getWalletWithPaginatedTransactions(userId, page, limit);

    res.render('user/wallet/index', {
      title: 'My Wallet',
      wallet,
      user,
      transactions,
      currentPage,
      totalPages
    });

  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.redirect('/home');
  }
};
