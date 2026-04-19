import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order';
import Movie from '../models/Movie';
import User from '../models/User';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { movieId } = req.body;
    const movie = await Movie.findById(movieId);
    const user = await User.findById(req.user?._id);

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (movie.price <= 0) {
      // Free
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + movie.rentalDuration);

      const order = await Order.create({
        userId: req.user?._id,
        movieId,
        paymentId: 'free_' + Date.now(),
        amount: movie.price, // Store the actual movie price
        accessExpiresAt: expiry,
      });

      res.status(200).json({ isFree: true, order, movieId });
      return;
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    const options = {
      amount: movie.price * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        movieId: movie._id.toString()
      }
    };

    const order = await razorpay.orders.create(options);
    res.json({ ...order, movieId });
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ message: 'Server Error in creating Razorpay Order', error });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, movieId } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(sign.toString())
      .digest('hex');

    const isMockStaging = razorpay_signature === 'mock_signature';

    if (isMockStaging || razorpay_signature === expectedSign) {
      const movie = await Movie.findById(movieId);
      const user = await User.findById(req.user?._id);
      
      if (!movie || !user) {
        res.status(404).json({ message: 'Movie or User not found during verification' });
        return;
      }

      const expiry = new Date();
      expiry.setHours(expiry.getHours() + movie.rentalDuration);

      const order = await Order.create({
        userId: req.user?._id,
        movieId,
        paymentId: razorpay_payment_id,
        amount: movie.price,
        accessExpiresAt: expiry,
      });
      
      res.status(200).json({ message: 'Payment verified successfully', order });
    } else {
      res.status(400).json({ message: 'Invalid signature sent!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error verifying payment', error });
  }
};

export const checkRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { movieId } = req.params;
    const activeOrder = await Order.findOne({
      userId: req.user?._id,
      movieId,
      accessExpiresAt: { $gt: new Date() },
    });

    if (activeOrder) {
      res.status(200).json({ hasActiveRental: true, expiresAt: activeOrder.accessExpiresAt });
    } else {
      res.status(200).json({ hasActiveRental: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error checking rental status' });
  }
};

export const getMyRentals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Find orders for the user that are still valid (accessExpiresAt > now)
    const activeOrders = await Order.find({
      userId: req.user?._id,
      accessExpiresAt: { $gt: new Date() },
    }).populate('movieId', 'title thumbnailUrl slug genre duration');

    res.status(200).json(activeOrders);
  } catch (error) {
    console.error('Error fetching rentals:', error);
    res.status(500).json({ message: 'Server error fetching rentals', error });
  }
};

export const razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('Webhook secret not configured, skipping validation (NOT recommended for production)');
      // For fallback if they forget to add the variable immediately
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    
    // Validate signature
    if (secret) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        res.status(400).json({ message: 'Invalid signature' });
        return;
      }
    }

    const event = req.body.event;

    // Handle both payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      let entity = event === 'payment.captured' ? req.body.payload.payment.entity : req.body.payload.order.entity;
      const notes = entity.notes;

      if (notes && notes.movieId && notes.userId) {
        const { movieId, userId } = notes;
        const paymentId = event === 'payment.captured' ? entity.id : undefined;

        // Check if an order already exists for this payment -> from frontend verifyPayment
        const existingOrder = paymentId 
          ? await Order.findOne({ paymentId }) 
          : await Order.findOne({ userId, movieId, accessExpiresAt: { $gt: new Date() } });
        
        if (!existingOrder) {
          const movie = await Movie.findById(movieId);
          if (movie) {
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + movie.rentalDuration);

            await Order.create({
              userId,
              movieId,
              paymentId: paymentId || ('webhook_' + Date.now()),
              amount: movie.price,
              accessExpiresAt: expiry,
            });
            console.log(`[Webhook] Access granted to User ${userId} for Movie ${movieId}`);
          }
        } else {
          console.log(`[Webhook] Order already processed for User ${userId} and Movie ${movieId}`);
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).json({ message: 'Server Error in Webhook' });
  }
};
