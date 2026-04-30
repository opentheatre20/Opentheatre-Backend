import express from 'express';
import { createOrder, verifyPayment, checkRental, getMyRentals, razorpayWebhook } from '../controllers/paymentController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/check-rental/:movieId', protect, checkRental);
router.get('/my-movies', protect, getMyRentals);
router.post('/webhook', razorpayWebhook);

export default router;
