import express from 'express';
import { loadLanding } from '../../controllers/user/landingController.js';

const router = express.Router();

router.get('/', loadLanding);

export default router;