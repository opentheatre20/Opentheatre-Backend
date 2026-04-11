import { Request, Response } from 'express';
import User from '../models/User';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);

    if (user) {
      user.name = req.body.name || user.name;
      
      if (req.body.email && req.body.email !== user.email) {
        // Enforce uniqueness manually to supply a helpful error
        const existingEmail = await User.findOne({ email: req.body.email });
        if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
           return res.status(400).json({ message: 'Email is already registered to another account' });
        }
        user.email = req.body.email;
      }

      if (req.body.phoneNumber && req.body.phoneNumber !== user.phoneNumber) {
        // Enforce uniqueness manually to supply a helpful error
        const existingPhone = await User.findOne({ phoneNumber: req.body.phoneNumber });
        if (existingPhone && existingPhone._id.toString() !== user._id.toString()) {
           return res.status(400).json({ message: 'Phone number is already registered to another account' });
        }
        user.phoneNumber = req.body.phoneNumber;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);

    if (user) {
      await User.deleteOne({ _id: user._id });
      res.json({ message: 'User account deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
