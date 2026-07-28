import express from 'express';
import methodOverride from 'method-override';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import adminAuthRoutes from './routes/admin/authRoutes.js';
import dashboardRoutes from './routes/admin/dashboardRoutes.js';
import userRoutes from './routes/admin/userRoutes.js';
import categoryRoutes from './routes/admin/categoryRoutes.js';
import productRoutes from './routes/admin/productRoutes.js';
import landingRoutes from './routes/user/landingRoutes.js';
import userAuthRoutes from './routes/user/authRoutes.js';
import homeRoutes from './routes/user/homeRoutes.js';
import profileRoutes from './routes/user/profileRoutes.js';
import addressRoutes from './routes/user/addressRoutes.js';
import passport from './config/passport.js';
import { preventCache } from './middleware/authMiddleware.js';
import { formStateMiddleware } from './middleware/formMiddleware.js';
import sessionConfig from './config/session.js';

dotenv.config();

const app = express();


connectDB();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use(sessionConfig)


app.use(express.static('public'));


app.set('view engine', 'ejs');
app.set('views', './views');


 
app.use(passport.initialize());

 
app.use(preventCache);


app.use(formStateMiddleware);


app.use((req, res, next) => {
  // Flash messages
  res.locals.success = req.session.success || res.locals.success || null;
  res.locals.error = req.session.error || res.locals.error || null;
  delete req.session.success;
  delete req.session.error;

  // Global user/admin state for EJS templates
  res.locals.admin = req.session.admin || null;
  res.locals.user = req.session.user || null;
  
  next();
});


// Admin
app.use('/admin', adminAuthRoutes);
app.use('/admin', dashboardRoutes);
app.use('/admin', userRoutes);
app.use('/admin', categoryRoutes);
app.use('/admin', productRoutes);

// User
app.use('/', landingRoutes);
app.use('/', userAuthRoutes);
app.use('/', homeRoutes);
app.use('/', profileRoutes);
app.use('/', addressRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler caught an error:');
  console.error(err instanceof Error ? err.stack : JSON.stringify(err, null, 2));

  // If the error comes from Multer/Cloudinary
  if (err.message && err.message.includes('cloud_name')) {
    err.message = 'Cloudinary configuration is missing in .env file.';
  }

  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Internal Server Error' 
    });
  }
  
  res.status(500).send('Internal Server Error: ' + (err.message || 'Unknown error'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
