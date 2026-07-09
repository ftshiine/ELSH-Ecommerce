import express from 'express';
import { loadHome } from '../../controllers/user/homeController.js';
import { isUserLoggedIn } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/home', isUserLoggedIn, loadHome);

export default router