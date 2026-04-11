import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

export default router;
