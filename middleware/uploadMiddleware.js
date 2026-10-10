import multer from 'multer';
import path from 'path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

//Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ELSH/users/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png|webp/;
  const allowedMimes = /image\/jpeg|image\/jpg|image\/png|image\/webp/;
  
  const isValidExt = allowedExts.test(
    path.extname(file.originalname).toLowerCase()
  );
  const isValidMime = allowedMimes.test(file.mimetype);

  if (isValidExt && isValidMime) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

const uploadLimits = { fileSize: 5 * 1024 * 1024 }; // 5MB

const upload = multer({
  storage,
  fileFilter,
  limits: uploadLimits,
});

export const handleProfileUpload = (req, res, next) => {
  const uploadSingle = upload.single('profileImage');
  uploadSingle(req, res, (err) => {
    if (err) {
      let errorMessage = err.message;
      if (err.message === 'INVALID_FILE_TYPE') {
        errorMessage = 'Only image files (JPG, PNG, WEBP) are allowed!';
      } else if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'Profile image is too large. Choose a different image (Max 5MB).';
      }
      return res.redirectWithState('/profile/edit', { error: errorMessage });
    }
    next();
  });
};

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

const offerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ELSH/offers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

export const uploadCategory = multer({ storage: categoryStorage, fileFilter, limits: uploadLimits });
export const uploadProducts = multer({ storage: productStorage, fileFilter, limits: uploadLimits });
export const uploadOffers = multer({ storage: offerStorage, fileFilter, limits: uploadLimits });
