import express from 'express';
import { getStreamForMovie, updateWatchTime } from '../controllers/videoController';
import { protect } from '../middlewares/authMiddleware';
import { requireActiveRental } from '../middlewares/rentalMiddleware';

const router = express.Router();

// Enforcing protect & requireActiveRental
router.get('/:movieId/stream', protect, requireActiveRental, getStreamForMovie);
router.post('/:movieId/history', protect, updateWatchTime); 

export default router;
