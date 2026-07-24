import express from 'express';
import {
  loadProfile, loadEditProfile, editProfile, removePhoto,
  requireEmailState, initiateEmailChange, loadVerifyCurrentEmail,
  verifyCurrentEmail, loadNewEmail, submitNewEmail,
  loadVerifyNewEmail, verifyNewEmail, cancelEmailChange
} from '../../controllers/user/profileController.js';
import { loadChangePassword, changePassword, authSendForgotPasswordOTP } from '../../controllers/user/passwordController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

import { handleProfileUpload } from '../../middleware/uploadMiddleware.js';
//profile routes
router.get('/profile', requireAuth('user'), loadProfile);

//edit profile routes
router.get('/profile/edit', requireAuth('user'), loadEditProfile);
router.put('/profile', requireAuth('user'), handleProfileUpload, editProfile);
router.delete('/profile/photo', requireAuth('user'), removePhoto);

// Email Change Routes
router.post('/profile/email/initiate', requireAuth('user'), initiateEmailChange);
router.get('/profile/email/verify-current', requireAuth('user'), requireEmailState('pending_current_verify'), loadVerifyCurrentEmail);
router.post('/profile/email/verify-current', requireAuth('user'), requireEmailState('pending_current_verify'), verifyCurrentEmail);
router.get('/profile/email/new', requireAuth('user'), requireEmailState('current_verified'), loadNewEmail);
router.post('/profile/email/new', requireAuth('user'), requireEmailState('current_verified'), submitNewEmail);
router.get('/profile/email/verify-new', requireAuth('user'), requireEmailState('pending_new_verify'), loadVerifyNewEmail);
router.post('/profile/email/verify-new', requireAuth('user'), requireEmailState('pending_new_verify'), verifyNewEmail);
router.post('/profile/email/cancel', requireAuth('user'), cancelEmailChange);

// Change Password routes
router.get('/profile/change-password', requireAuth('user'), loadChangePassword);
router.patch('/profile/password', requireAuth('user'), changePassword);
router.post('/profile/forgot-password/init', requireAuth('user'), authSendForgotPasswordOTP);

export default router;