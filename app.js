import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import connectDB from './config/db.js';
import adminAuthRoutes from './routes/admin/authRoutes.js';
import dashboardRoutes from './routes/admin/dashboardRoutes.js';
import userRoutes from './routes/admin/userRoutes.js';
import landingRoutes from './routes/user/landingRoutes.js';
import userAuthRoutes from './routes/user/authRoutes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// View engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Global no-cache middleware
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
  },
}));

// Routes
//Admin
app.use('/admin', adminAuthRoutes);
app.use('/admin', dashboardRoutes);
app.use('/admin', userRoutes);
//User
app.use('/', landingRoutes);
app.use('/', userAuthRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});