import { Response, Request } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Movie from '../models/Movie';
import WatchHistory from '../models/WatchHistory';
import { getStreamUrl } from '../services/bunnyService';
import https from 'https';
import crypto from 'crypto';

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

// Proxy the m3u8 playlist, rewriting the DRM key URI to point to our backend
export const proxyM3u8 = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const quality = (req.query.quality as string) || '240p';
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || '';
    const backendUrl = process.env.BACKEND_URL || `https://api.opentheatre.in`;

    const m3u8Url = `https://${cdnHostname}/${videoId}/${quality}/video.m3u8`;

    const m3u8Content = await new Promise<string>((resolve, reject) => {
      https.get(m3u8Url, { headers: { Referer: 'https://iframe.mediadelivery.net/' } }, (m3u8Res) => {
        let body = '';
        m3u8Res.on('data', (chunk) => body += chunk);
        m3u8Res.on('end', () => {
          if (m3u8Res.statusCode && m3u8Res.statusCode >= 400) {
            reject(new Error(`Failed to fetch m3u8: ${m3u8Res.statusCode}`));
          } else {
            resolve(body);
          }
        });
        m3u8Res.on('error', reject);
      }).on('error', reject);
    });

    // Rewrite the key URI from relative path to our backend proxy
    // Original: URI="/videoId/key/keyId"
    // Rewritten: URI="https://api.opentheatre.in/api/videos/videoId/drm-key/keyId"
    let rewritten = m3u8Content.replace(
      /URI="(\/[^"]+\/key\/[^"]+)"/g,
      (_match: string, keyPath: string) => {
        const keyId = keyPath.split('/').pop();
        return `URI="${backendUrl}/api/videos/${videoId}/drm-key/${keyId}"`;
      }
    );

    // Rewrite relative segment URLs to absolute Bunny CDN URLs
    // so HLS.js can resolve them from a Blob URL on the frontend
    const segmentBase = `https://${cdnHostname}/${videoId}/${quality}/`;
    rewritten = rewritten.replace(
      /^(video\d+\.dts)$/gm,
      (seg) => `${segmentBase}${seg}`
    );

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(rewritten);
  } catch (error: any) {
    res.status(500).json({ message: 'Error proxying m3u8', error: error.message });
  }
};

// Proxy the DRM encryption key from Bunny CDN with CORS headers
export const proxyDrmKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId, keyId } = req.params;
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || '';
    const tokenKey = (process.env.BUNNY_STREAM_TOKEN_KEY || '').trim();

    let keyUrl = `https://${cdnHostname}/${videoId}/key/${keyId}`;

    // Add token auth if available
    if (tokenKey) {
      const expires = Math.floor(Date.now() / 1000) + 21600;
      const signature = `${tokenKey}${videoId}${expires}`;
      const token = crypto.createHash('sha256').update(signature).digest('hex');
      keyUrl += `?token=${token}&expires=${expires}`;
    }

    const keyData = await new Promise<Buffer>((resolve, reject) => {
      https.get(keyUrl, { headers: { Referer: 'https://iframe.mediadelivery.net/' } }, (keyRes) => {
        const chunks: Buffer[] = [];
        keyRes.on('data', (chunk) => chunks.push(chunk));
        keyRes.on('end', () => {
          if (keyRes.statusCode && keyRes.statusCode >= 400) {
            reject(new Error(`Failed to fetch DRM key: ${keyRes.statusCode}`));
          } else {
            resolve(Buffer.concat(chunks));
          }
        });
        keyRes.on('error', reject);
      }).on('error', reject);
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.send(keyData);
  } catch (error: any) {
    res.status(500).json({ message: 'Error proxying DRM key', error: error.message });
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
