import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review';
import Movie from '../models/Movie';
import Order from '../models/Order';
import AdminActivityLog from '../models/AdminActivityLog';
import { AuthRequest } from '../middlewares/authMiddleware';

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { movie: movieIdOrSlug, rating, comment } = req.body;
    const user = req.user as any;

    if (!user?._id) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Resolve movie ID if slug is provided
    let movieDoc;
    if (mongoose.isValidObjectId(movieIdOrSlug)) {
        movieDoc = await Movie.findById(movieIdOrSlug);
    }
    if (!movieDoc) {
        movieDoc = await Movie.findOne({ slug: movieIdOrSlug });
    }

    if (!movieDoc) {
        res.status(404).json({ message: 'Movie not found' });
        return;
    }

    // Check if the user has rented the movie
    const rental = await Order.findOne({
        userId: user._id,
        movieId: movieDoc._id
    });

    if (!rental) {
        res.status(403).json({ message: 'You must rent this movie before reviewing it.' });
        return;
    }

    const review = await Review.create({
      user: user._id,
      movie: movieDoc._id,
      rating,
      title: req.body.title,
      comment,
      verifiedPurchase: true,
    });

    const populatedReview = await Review.findById(review._id).populate('user', 'name');

    res.status(201).json(populatedReview);
  } catch (error) {
    console.error('Create Review Error:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getMovieReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { movieId: movieIdOrSlug } = req.params;

    // Resolve movie ID if slug is provided
    let movieDoc;
    if (mongoose.isValidObjectId(movieIdOrSlug)) {
        movieDoc = await Movie.findById(movieIdOrSlug);
    }
    if (!movieDoc) {
        movieDoc = await Movie.findOne({ slug: movieIdOrSlug });
    }

    if (!movieDoc) {
        res.status(404).json({ message: 'Movie not found' });
        return;
    }

    const reviews = await Review.find({ movie: movieDoc._id })
      .populate('user', 'name')
      .sort({ helpfulVotes: -1, createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const likeReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    if (!user?._id) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Toggle logic: If already liked, unlike it. If disliked, remove from dislike and add to like.
    if (review.likes.includes(user._id)) {
      review.likes = review.likes.filter(userId => userId.toString() !== user._id.toString());
    } else {
      review.dislikes = review.dislikes.filter(userId => userId.toString() !== user._id.toString());
      review.likes.push(user._id);
    }

    await review.save();
    
    // Return populated review to update UI instantly
    const populated = await Review.findById(id).populate('user', 'name');
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const dislikeReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    if (!user?._id) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    if (review.dislikes.includes(user._id)) {
      review.dislikes = review.dislikes.filter(userId => userId.toString() !== user._id.toString());
    } else {
      review.likes = review.likes.filter(userId => userId.toString() !== user._id.toString());
      review.dislikes.push(user._id);
    }

    await review.save();
    
    const populated = await Review.findById(id).populate('user', 'name');
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const adminUpdateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comment, rating } = req.body;
    
    const review = await Review.findById(id);
    if (!review) { res.status(404).json({ message: 'Review not found' }); return; }
    
    const oldData = review.toObject();
    
    if (comment !== undefined) review.comment = comment;
    if (rating !== undefined) review.rating = rating;
    await review.save();

    await AdminActivityLog.create({
      actionType: 'UPDATE', targetModel: 'Review', targetId: review._id,
      oldData, newData: review.toObject(), performedBy: (req.user as any)?._id
    });
    
    res.json(review);
  } catch (error) { res.status(500).json({ message: 'Server Error editing review', error }); }
};

export const adminDeleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) { res.status(404).json({ message: 'Review not found' }); return; }
    
    const oldData = review.toObject();
    const deletedReview = await Review.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), deletedBy: (req.user as any)?._id }, { new: true });

    await AdminActivityLog.create({
      actionType: 'DELETE', targetModel: 'Review', targetId: review._id,
      oldData, newData: deletedReview?.toObject(), performedBy: (req.user as any)?._id
    });
    
    res.json({ message: 'Review soft deleted' });
  } catch (error) { res.status(500).json({ message: 'Server Error deleting review', error }); }
};

export const adminClearReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { movieId } = req.body;
    if (!movieId) { res.status(400).json({ message: 'Movie ID required' }); return; }
    
    await Review.updateMany({ movie: movieId }, { isDeleted: true, deletedAt: new Date(), deletedBy: (req.user as any)?._id });

    await AdminActivityLog.create({
      actionType: 'CLEAR', targetModel: 'Review', targetId: movieId, 
      oldData: { movieId }, newData: { isDeleted: true }, performedBy: (req.user as any)?._id
    });
    
    res.json({ message: 'Movie reviews cleared successfully' });
  } catch (error) { res.status(500).json({ message: 'Server Error clearing reviews', error }); }
};

export const adminRestoreReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await Review.findOne({ _id: id, isDeleted: true });
    if (!review) { res.status(404).json({ message: 'Deleted review not found' }); return; }
    
    const oldData = review.toObject();
    const restoredReview = await Review.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null }, { new: true });

    await AdminActivityLog.create({
      actionType: 'REVERT', targetModel: 'Review', targetId: review._id,
      oldData, newData: restoredReview?.toObject(), performedBy: (req.user as any)?._id
    });
    
    res.json({ message: 'Review restored successfully' });
  } catch (error) { res.status(500).json({ message: 'Server Error restoring review', error }); }
};
