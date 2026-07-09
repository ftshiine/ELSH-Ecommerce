import express from 'express';
import { loadLanding } from '../../controllers/user/landingController.js';
import { isUserLoggedOut } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', isUserLoggedOut, loadLanding);

export default router;