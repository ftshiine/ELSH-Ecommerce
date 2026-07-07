import express from 'express';
import { loadDashboard } from '../../controllers/admin/dashboardController.js';
import { isAdminLoggedIn } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', isAdminLoggedIn, loadDashboard);

export default router;