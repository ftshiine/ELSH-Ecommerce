import express from 'express';
import { loadHome } from '../../controllers/user/homeController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/home', requireAuth('user'), loadHome);

export default router