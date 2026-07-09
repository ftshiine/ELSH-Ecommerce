import express from 'express';
import multer from 'multer';
import path from 'path';
import { loadProfile, loadEditProfile, editProfile, removePhoto, editEmailRequest, verifyEmailOtp } from '../../controllers/user/profileController.js';
import { isUserLoggedIn } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Multer setup for profile image upload
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

router.get('/profile', isUserLoggedIn, loadProfile);
router.get('/profile/edit', isUserLoggedIn, loadEditProfile);
router.post('/profile/edit', isUserLoggedIn, upload.single('profileImage'), editProfile);
router.post('/profile/remove-photo', isUserLoggedIn, removePhoto);
router.post('/profile/edit-email-request', isUserLoggedIn, express.json(), editEmailRequest);
router.post('/profile/verify-email-otp', isUserLoggedIn, express.json(), verifyEmailOtp);

export default router;