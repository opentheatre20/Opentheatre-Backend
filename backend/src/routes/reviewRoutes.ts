import express from 'express';
import { createReview, getMovieReviews, likeReview, dislikeReview, adminReplyReview } from '../controllers/reviewController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect as any, createReview);
router.get('/:movieId', getMovieReviews);
router.post('/:id/like', protect as any, likeReview);
router.post('/:id/dislike', protect as any, dislikeReview);
router.post('/:id/reply', protect as any, admin as any, adminReplyReview);

export default router;
