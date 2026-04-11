import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Movie from '../models/Movie';
import WatchHistory from '../models/WatchHistory';
import { getStreamUrl } from '../services/bunnyService';

import mongoose from 'mongoose';

export const getStreamForMovie = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { movieId } = req.params;
    let movie;
    if (mongoose.isValidObjectId(movieId)) {
      movie = await Movie.findById(movieId);
    }
    if (!movie) {
      // Fallback
      movie = await Movie.findOne({ slug: movieId });
    }

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    // Rental has been verified by the rentalMiddleware, we can issue the stream URL
    // VideoLibraryId comes from the movie doc or env. If we store videoId per movie in Bunny:
    // movie.videoLibraryId usually stores the actual video Guid in Bunny Stream.
    const streamUrl = getStreamUrl(movie.videoLibraryId);

    res.json({ streamUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error generating stream URL' });
  }
};

export const updateWatchTime = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { movieId } = req.params;
    const { watchTime, percentageCompleted, lastPosition } = req.body;

    if (!req.user) {
      res.json({ message: 'Watch history ignored for unauthenticated user' });
      return;
    }

    // Resolve movieId from slug if needed
    let movie;
    if (mongoose.isValidObjectId(movieId)) {
      movie = await Movie.findById(movieId);
    }
    if (!movie) {
      movie = await Movie.findOne({ slug: movieId });
    }

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    const actualMovieId = movie._id;

    let history = await WatchHistory.findOne({ userId: req.user._id, movieId: actualMovieId });

    if (history) {
      history.watchTime += watchTime || 0;
      history.percentageCompleted = percentageCompleted || history.percentageCompleted;
      history.lastPosition = lastPosition || history.lastPosition;
      history.updatedAt = new Date();
      await history.save();
    } else {
      history = await WatchHistory.create({
        userId: req.user._id,
        movieId: actualMovieId,
        watchTime: watchTime || 0,
        percentageCompleted: percentageCompleted || 0,
        lastPosition: lastPosition || 0,
      });
    }

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error updating watch history', error });
  }
};
