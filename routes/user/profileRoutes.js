import express from 'express';
import multer from 'multer';
import path from 'path';
import { loadProfile, loadEditProfile, editProfile, removePhoto, editEmailRequest, verifyEmailOtp } from '../../controllers/user/profileController.js';
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
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        req.uploadError = 'Profile image is too large. Please upload an image smaller than 5 MB.';
      } else {
        req.uploadError = err.message;
      }
    }
    next();
  });
};

router.get('/profile', requireAuth('user'), loadProfile);
router.get('/profile/edit', requireAuth('user'), loadEditProfile);
router.post('/profile/edit', requireAuth('user'), handleUpload, editProfile);
router.post('/profile/remove-photo', requireAuth('user'), removePhoto);
router.post('/profile/edit-email-request', requireAuth('user'), express.json(), editEmailRequest);
router.post('/profile/verify-email-otp', requireAuth('user'), express.json(), verifyEmailOtp);

// Change Password routes
router.get('/profile/change-password', requireAuth('user'), loadChangePassword);
router.post('/profile/change-password', requireAuth('user'), changePassword);
router.post('/profile/forgot-password/init', requireAuth('user'), authSendForgotPasswordOTP);

export default router;