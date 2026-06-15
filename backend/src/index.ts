import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db';

dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID', 
  'RAZORPAY_KEY_SECRET', 
  'BUNNY_API_KEY',
  'BUNNY_STREAM_LIBRARY_ID',
  'BUNNY_CDN_HOSTNAME'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('\n⚠️  WARNING: Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.warn(`  - ${envVar}`));
  console.warn('Some features (like payments or streaming) may not work correctly until these are set in your .env file.\n');
}

// Connect to DB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const corsOptions = {
  origin: function (origin: any, callback: any) {
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "*.b-cdn.net", "lh3.googleusercontent.com"], // Added Google avatars too
      "frame-src": ["'self'", "iframe.mediadelivery.net", "*.youtube.com"],
      "connect-src": ["'self'", "*.b-cdn.net"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
// Apply limiter to all auth routes as a basic protection
app.use('/api/auth', limiter);
const genericLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api', genericLimiter);

// Specific enterprise rate limits
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 payments per hour per IP
  message: 'Too many payment requests from this IP, please try again after an hour'
});
app.post('/api/payment/create-order', paymentLimiter);

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 reviews per hour per IP
  message: 'Too many reviews from this IP, please try again after an hour'
});
app.post('/api/reviews', reviewLimiter);
app.post('/api/reviews/:id/like', reviewLimiter);
app.post('/api/reviews/:id/dislike', reviewLimiter);


// Passport OAuth
import passport from 'passport';
import { configurePassport } from './config/passport';
configurePassport();
app.use(passport.initialize());

import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';
import videoRoutes from './routes/videoRoutes';
import adminRoutes from './routes/adminRoutes';
import movieRoutes from './routes/movieRoutes';
import reviewRoutes from './routes/reviewRoutes';
import userRoutes from './routes/userRoutes';
import otpRoutes from './routes/otpRoutes';
import notificationRoutes from './routes/notificationRoutes';
import configRoutes from './routes/configRoutes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Final fallback error logger for all unhandled HTTP failures
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`\n🔥 FATAL EXPRESS ERROR on ${req.method} ${req.url}:`);
    console.error(err.stack);
    console.error(`\n`);
    res.status(500).json({ message: 'Internal Server Crash', error: err.message });
});

import { initCronJobs } from './services/cronService';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n\n`);
    console.log(`*************************************************`);
    console.log(`* 🍿 OPEN THEATRE OTT SERVER                     *`);
    console.log(`* 🚀 RUNNING ON PORT:    ${PORT}                   *`);
    console.log(`* 🌍 ENVIRONMENT:        ${process.env.NODE_ENV || 'development'}            *`);
    console.log(`*************************************************\n`);
    initCronJobs();
});
