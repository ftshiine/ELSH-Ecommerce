import Wallet from '../../models/Wallet.js';
import User from '../../models/User.js';

export const getWallet = async (req, res) => {
  try {
    const userId = req.session.user.id;
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = new Wallet({ user: userId, balance: 0, totalRefunds: 0, transactions: [] });
      await wallet.save();
    }

    // Pagination for transactions (5 per page)
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

    // Sort transactions by date descending
    const sortedTransactions = wallet.transactions.sort((a, b) => b.date - a.date);

    // Slice for pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

    const user = await User.findById(userId);

    res.render('user/wallet/index', {
      title: 'My Wallet',
      wallet,
      user,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages: totalPages
    });

  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.redirect('/home');
  }
};
