import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User';
import OTP from '../models/OTP';
import Notification from '../models/Notification';

// @desc    Generate and send OTP
// @route   POST /api/otp/send
// @access  Public
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Generate 6 digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save/Update OTP in DB
    await OTP.findOneAndUpdate(
      { phoneNumber },
      { otp: otpCode, expiresAt },
      { upsert: true, new: true }
    );

    // MOCK SMS SENDING - Fallback
    console.log(`[SMS MOCK] Sending OTP ${otpCode} to ${phoneNumber} virtually.`);

    res.json({ 
      message: 'OTP processed successfully',
      otp: process.env.NODE_ENV !== 'production' ? otpCode : undefined 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and Log In/Sign Up
// @route   POST /api/otp/verify
// @access  Public
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const otpRecord = await OTP.findOne({ phoneNumber, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // OTP is valid, delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    // Find or Create user
    let user = await User.findOne({ phoneNumber });

    if (!user) {
      // Create a default name for new users
      user = await User.create({
        phoneNumber,
        name: `User ${phoneNumber.slice(-4)}`,
        // Workaround for MongoDB unique email constraint:
        // Set a dummy unique email until user links their real one
        email: `otp_user_${phoneNumber}@opentheatre.local`,
        provider: 'phone',
        role: 'user'
      });
      
      // Generate welcome notification async
      Notification.create({
        user: user._id,
        title: 'Welcome to Open Theatre! 🍿',
        message: 'Explore our vast library of independent short films and movies.',
        targetUrl: '/movies'
      }).catch(err => console.error("Error creating welcome notification:", err));
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      (process.env.JWT_SECRET || 'secret') as jwt.Secret,
      { expiresIn: '30d' }
    );

    res.json({
      _id: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
