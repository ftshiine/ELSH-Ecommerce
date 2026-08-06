import express from 'express';
import methodOverride from 'method-override';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import passport from './config/passport.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorMiddleware.js';
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

// Use Central Routers
app.use('/admin', adminRoutes);
app.use('/', userRoutes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
