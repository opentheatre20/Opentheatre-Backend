import express from 'express';
import { createReview, getMovieReviews, likeReview, dislikeReview } from '../controllers/reviewController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect as any, createReview);
router.get('/:movieId', getMovieReviews);
router.post('/:id/like', protect as any, likeReview);
router.post('/:id/dislike', protect as any, dislikeReview);

export default router;
