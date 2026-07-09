import express from 'express';
import { loadLanding } from '../../controllers/user/landingController.js';
import { requireGuest } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', requireGuest('user'), loadLanding);

export default router;