import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { getWallet } from '../../controllers/user/walletController.js';

const router = express.Router();

router.get('/wallet', requireAuth('user'), getWallet);

export default router;
