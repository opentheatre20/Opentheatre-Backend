import express from 'express';
import { getMovies } from '../controllers/adminController';
import Movie from '../models/Movie';
import { Request, Response } from 'express';

const router = express.Router();

import { signCdnUrl } from '../services/bunnyService';

export const getPublicMovies = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchQuery = req.query.search ? String(req.query.search) : '';
    const query: any = { isActive: true };
    
    if (searchQuery) {
      query.title = { $regex: searchQuery, $options: 'i' };
    }

    const movies = await Movie.find(query).limit(searchQuery ? 5 : 0).lean();
    
    const signedMovies = movies.map(movie => ({
      ...movie,
      thumbnailUrl: signCdnUrl(movie.thumbnailUrl || '')
    }));
    res.json(signedMovies);
  } catch (error: any) {
    console.error('\n❌ FATAL MOVIE ROUTE ERROR:', error);
    res.status(500).json({ message: 'Server Error', error: error.message, stack: error.stack });
  }
};

import mongoose from 'mongoose';

export const getMovieById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let movie;
    if (mongoose.isValidObjectId(id)) {
      movie = await Movie.findById(id).lean();
    }
    if (!movie) {
      movie = await Movie.findOne({ slug: id }).lean();
    }
    
    if (movie) {
      movie.thumbnailUrl = signCdnUrl(movie.thumbnailUrl || '');
      res.json(movie);
    } else {
      res.status(404).json({ message: 'Movie not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getTopRatedMovies = async (req: Request, res: Response): Promise<void> => {
  try {
    const topMovies = await mongoose.model('Review').aggregate([
      {
        $group: {
          _id: '$movie',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $sort: { averageRating: -1, reviewCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movieDetails'
        }
      },
      { $unwind: '$movieDetails' }
    ]);
    
    const formatted = topMovies.map(movie => ({
      ...movie.movieDetails,
      averageRating: movie.averageRating,
      reviewCount: movie.reviewCount,
      thumbnailUrl: signCdnUrl(movie.movieDetails.thumbnailUrl || '')
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};



router.get('/', getPublicMovies);
router.get('/top-rated', getTopRatedMovies);
router.get('/:id', getMovieById);

export default router;
