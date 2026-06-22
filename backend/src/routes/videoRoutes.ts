import express from 'express';
import { getStreamForMovie, updateWatchTime, proxyM3u8, proxyDrmKey } from '../controllers/videoController';
import { protect } from '../middlewares/authMiddleware';
import { requireActiveRental } from '../middlewares/rentalMiddleware';

const router = express.Router();

// Enforcing protect & requireActiveRental
router.get('/:movieId/stream', protect, requireActiveRental, getStreamForMovie);
router.post('/:movieId/history', protect, updateWatchTime);

// DRM key and m3u8 proxy routes (public, auth is handled by Bunny token)
router.options('/:videoId/drm-key/:keyId', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.sendStatus(204);
});
router.get('/:videoId/drm-key/:keyId', proxyDrmKey);
router.get('/:videoId/playlist.m3u8', protect, requireActiveRental, proxyM3u8);

export default router;
