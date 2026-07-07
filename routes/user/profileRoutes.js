import express from 'express';
import { loadProfile } from '../../controllers/user/profileController.js';

const router = express.Router();

router.get('/profile',loadProfile);

export default router;