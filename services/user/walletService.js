import Wallet from '../../models/Wallet.js';
import User from '../../models/User.js';
import { STATUS_CODES, WALLET_MESSAGES } from '../../constants/index.js';

export const getOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
        wallet = new Wallet({ user: userId, balance: 0, totalRefunds: 0, transactions: [] });
        await wallet.save();
    }
    return wallet;
};

export const getWalletWithPaginatedTransactions = async (userId, page = 1, limit = 5) => {
    const wallet = await getOrCreateWallet(userId);
    const user = await User.findById(userId);

    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit) || 1;

    // Sort transactions by date descending
    const sortedTransactions = [...wallet.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    const startIndex = (page - 1) * limit;
    const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + limit);

    return {
        wallet,
        user,
        transactions: paginatedTransactions,
        currentPage: page,
        totalPages
    };
};

export const creditWallet = async (userId, amount, description) => {
    const wallet = await getOrCreateWallet(userId);
    const numAmount = Number(amount);

    wallet.balance += numAmount;
    wallet.transactions.push({
        amount: numAmount,
        type: 'CREDIT',
        description,
        date: new Date()
    });

    return await wallet.save();
};

export const debitWallet = async (userId, amount, description) => {
    const wallet = await getOrCreateWallet(userId);
    const numAmount = Number(amount);

    if (wallet.balance < numAmount) {
        const error = new Error(WALLET_MESSAGES.INSUFFICIENT_BALANCE);
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    wallet.balance -= numAmount;
    wallet.transactions.push({
        amount: numAmount,
        type: 'DEBIT',
        description,
        date: new Date()
    });

    return await wallet.save();
};
