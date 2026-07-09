import express from 'express';
import { loadAddresses, loadAddAddress, addAddress, loadEditAddress, editAddress, removeAddress, makePrimary } from '../../controllers/user/addressController.js';
import { isUserLoggedIn } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile/addresses', isUserLoggedIn, loadAddresses);
router.get('/profile/addresses/add', isUserLoggedIn, loadAddAddress);
router.post('/profile/addresses/add', isUserLoggedIn, addAddress);
router.get('/profile/addresses/edit/:id', isUserLoggedIn, loadEditAddress);
router.post('/profile/addresses/edit/:id', isUserLoggedIn, editAddress);
router.post('/profile/addresses/delete/:id', isUserLoggedIn, removeAddress);
router.post('/profile/addresses/primary/:id', isUserLoggedIn, makePrimary);

export default router;
