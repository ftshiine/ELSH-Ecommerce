import { STATUS_CODES, COMMON_MESSAGES } from '../constants/index.js';

export const notFoundHandler = (req, res, next) => {
  if (req.originalUrl.startsWith('/admin')) {
    res.status(STATUS_CODES.NOT_FOUND).render('admin/404', { activePage: '404', title: COMMON_MESSAGES.PAGE_NOT_FOUND });
  } else {
    res.status(STATUS_CODES.NOT_FOUND).render('user/404', { title: COMMON_MESSAGES.PAGE_NOT_FOUND });
  }
};

export const globalErrorHandler = (err, req, res, next) => {
  console.error('Global Error Handler caught an error:');
  console.error(err instanceof Error ? err.stack : JSON.stringify(err, null, 2));

  // If the error comes from Multer/Cloudinary
  if (err.message && err.message.includes('cloud_name')) {
    err.message = 'Cloudinary configuration is missing in .env file.';
  }

  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }

  res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(`${COMMON_MESSAGES.INTERNAL_SERVER_ERROR}: ` + (err.message || 'Unknown error'));
};
