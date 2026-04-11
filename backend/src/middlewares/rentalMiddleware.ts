import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import Order from '../models/Order';
import Movie from '../models/Movie';
import mongoose from 'mongoose';

export const requireActiveRental = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const movieIdParam = req.params.movieId || req.body.movieId;
    if (!movieIdParam) {
      res.status(400).json({ message: 'Movie ID is required' });
      return;
    }

    if (req.user?.role === 'admin') {
      next(); // Admins can stream without renting
      return;
    }

    // Resolve movieIdParam (could be slug or ObjectId)
    let actualMovieId = movieIdParam;
    if (!mongoose.isValidObjectId(movieIdParam)) {
      const movie = await Movie.findOne({ slug: movieIdParam });
      if (!movie) {
        res.status(404).json({ message: 'Movie not found' });
        return;
      }
      actualMovieId = movie._id;
    }

    const activeOrder = await Order.findOne({
      userId: req.user?._id,
      movieId: actualMovieId,
      accessExpiresAt: { $gt: new Date() } // Ensure it hasn't expired
    });

    if (!activeOrder) {
      res.status(403).json({ message: 'Active rental not found or expired' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error checking rental status' });
  }
};
