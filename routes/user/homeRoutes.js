import express from 'express';
import { loadHome } from '../../controllers/user/homeController.js';

const router = express.Router();

router.get('/home',loadHome);

export default router