import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Notification from '../models/Notification';
import User from '../models/User';
import Movie from '../models/Movie';

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ user: req.user?._id })
      .sort({ createdAt: -1 })
      .limit(50);
      
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user?._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { user: req.user?._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to mark notifications as read', error: error.message });
  }
};
