import multer from 'multer';
import path from 'path';


//Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/user/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});


//select only image
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

//upload
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
