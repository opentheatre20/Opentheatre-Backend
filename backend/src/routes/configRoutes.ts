import express from 'express';
import AppConfig from '../models/AppConfig';
import { Request, Response } from 'express';

const router = express.Router();

export const getPublicConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await AppConfig.findOne().lean();
    if (config) {
      res.json({
        heroBannerText: config.heroBannerText || 'YOU WILL NOT FIND THIS MOVIE ANYWHERE.',
        chromecastEnabled: config.chromecastEnabled
      });
    } else {
      res.json({
        heroBannerText: 'YOU WILL NOT FIND THIS MOVIE ANYWHERE.',
        chromecastEnabled: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching config', error });
  }
};

router.get('/', getPublicConfig);

export default router;
