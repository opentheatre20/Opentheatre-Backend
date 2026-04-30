import { Request, Response } from 'express';
import * as imageService from '../services/imageService';
import Movie from '../models/Movie';
import path from 'path';

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const filename = `${Date.now()}-${req.file.originalname}`;
    const url = await imageService.uploadToBunny(req.file.buffer, filename);

    res.status(201).json({ url, filename });
  } catch (error: any) {
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
};

export const getImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const bunnyFiles = await imageService.listFromBunny();
    const movies = await Movie.find({}, 'thumbnailUrl mobileThumbnailUrl');

    const usedUrls = new Set<string>();
    movies.forEach(movie => {
      if (movie.thumbnailUrl) usedUrls.add(movie.thumbnailUrl);
      if (movie.mobileThumbnailUrl) usedUrls.add(movie.mobileThumbnailUrl);
    });

    const pullZoneUrl = (process.env.BUNNY_PULL_ZONE_URL || '').replace(/\/$/, '');
    
    const images = bunnyFiles.map((file: any) => {
      const url = `${pullZoneUrl}/thumbnails/${file.ObjectName}`;
      return {
        name: file.ObjectName,
        url: url,
        size: file.Length,
        createdAt: file.DateCreated,
        isUsed: usedUrls.has(url)
      };
    });

    res.json(images);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching images', error: error.message });
  }
};

export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    
    // Check if used
    const pullZoneUrl = (process.env.BUNNY_PULL_ZONE_URL || '').replace(/\/$/, '');
    const url = `${pullZoneUrl}/thumbnails/${filename}`;
    
    const movieUsing = await Movie.findOne({
      $or: [
        { thumbnailUrl: url },
        { mobileThumbnailUrl: url }
      ]
    });

    if (movieUsing) {
      res.status(400).json({ message: 'Cannot delete image as it is currently being used by a movie' });
      return;
    }

    await imageService.deleteFromBunny(filename);
    res.json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
};
