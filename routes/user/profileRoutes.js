import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  loadProfile, loadEditProfile, editProfile, removePhoto,
  requireEmailState, initiateEmailChange, loadVerifyCurrentEmail,
  verifyCurrentEmail, loadNewEmail, submitNewEmail,
  loadVerifyNewEmail, verifyNewEmail, cancelEmailChange
} from '../../controllers/user/profileController.js';
import { loadChangePassword, changePassword, authSendForgotPasswordOTP } from '../../controllers/user/passwordController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Multer 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/user/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('profileImage');
  uploadSingle(req, res, (err) => {
    if (err) {
      let errorMessage = err.message;
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'Profile image is too large. Choose a different image.';
      }
      return res.redirectWithState('/profile/edit', { error: errorMessage });
    }
    next();
  });
};
//profile routes
router.get('/profile', requireAuth('user'), loadProfile);

//edit profile routes
router.get('/profile/edit', requireAuth('user'), loadEditProfile);
router.put('/profile', requireAuth('user'), handleUpload, editProfile);
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