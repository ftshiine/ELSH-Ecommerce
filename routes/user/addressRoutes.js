import express from 'express';
import { loadAddresses, loadAddAddress, addAddress, loadEditAddress, editAddress, removeAddress, makePrimary } from '../../controllers/user/addressController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile/addresses', requireAuth('user'), loadAddresses);
router.get('/profile/addresses/add', requireAuth('user'), loadAddAddress);
router.post('/profile/addresses/add', requireAuth('user'), addAddress);
router.get('/profile/addresses/edit/:id', requireAuth('user'), loadEditAddress);
router.put('/profile/addresses/:id', requireAuth('user'), editAddress);
router.delete('/profile/addresses/:id', requireAuth('user'), removeAddress);
router.patch('/profile/addresses/:id/primary', requireAuth('user'), makePrimary);

export default router;
