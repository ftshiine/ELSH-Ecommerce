export const notFoundHandler = (req, res, next) => {
  if (req.originalUrl.startsWith('/admin')) {
    res.status(404).render('admin/404', { activePage: '404', title: 'Page Not Found' });
  } else {
    res.status(404).render('user/404', { title: 'Page Not Found' });
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
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Internal Server Error' 
    });
  }
  
  res.status(500).send('Internal Server Error: ' + (err.message || 'Unknown error'));
};
