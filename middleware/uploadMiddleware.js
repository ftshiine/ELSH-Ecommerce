import multer from 'multer';
import path from 'path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// ---- Cloudinary Storage (for User Profile) ----
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ELSH/users/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
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

export const handleProfileUpload = (req, res, next) => {
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

// ---- Cloudinary Storage (for Categories and Products) ----

const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ELSH/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ELSH/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

export const uploadCategory = multer({ storage: categoryStorage });
export const uploadProducts = multer({ storage: productStorage });
