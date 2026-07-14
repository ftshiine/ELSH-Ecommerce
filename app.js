import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import adminAuthRoutes from './routes/admin/authRoutes.js';
import dashboardRoutes from './routes/admin/dashboardRoutes.js';
import userRoutes from './routes/admin/userRoutes.js';
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

// Connect to MongoDB
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(sessionConfig)

// Static files
app.use(express.static('public'));

// View engine
app.set('view engine', 'ejs');
app.set('views', './views');


// Passport initialization 
app.use(passport.initialize());

// Global Cache-Control for all dynamic routes 
app.use(preventCache);

// Global Form State preservation middleware
app.use(formStateMiddleware);

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  delete req.session.success;
  delete req.session.error;
  next();
});

// Routes
// Admin
app.use('/admin', adminAuthRoutes);
app.use('/admin', dashboardRoutes);
app.use('/admin', userRoutes);

// User
app.use('/', landingRoutes);
app.use('/', userAuthRoutes);
app.use('/', homeRoutes);
app.use('/', profileRoutes);
app.use('/', addressRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});