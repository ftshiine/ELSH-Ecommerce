import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  loadOffers,
  loadCreateOffer,
  createOffer,
  loadEditOffer,
  updateOffer,
  toggleOfferStatus
} from '../../controllers/admin/offerController.js';

const router = express.Router();

router.get('/offers', requireAuth('admin'), loadOffers);
router.get('/offers/create', requireAuth('admin'), loadCreateOffer);
router.post('/offers', requireAuth('admin'), createOffer);
router.get('/offers/:id/edit', requireAuth('admin'), loadEditOffer);
router.post('/offers/:id/edit', requireAuth('admin'), updateOffer);
router.patch('/offers/:id/toggle', requireAuth('admin'), toggleOfferStatus);

export default router;
