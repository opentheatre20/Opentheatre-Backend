import { Request, Response } from 'express';
import User from '../models/User';
import Notification from '../models/Notification';
import Review from '../models/Review';
import Order from '../models/Order';
import TrafficLog from '../models/TrafficLog';
import geoip from 'geoip-lite';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const generateTokens = (res: Response, id: string, role: string) => {
  const accessToken = jwt.sign({ id, role }, (process.env.JWT_SECRET || 'secret') as jwt.Secret, {
    expiresIn: '30d', // Long lived access token
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ id, role }, (process.env.JWT_REFRESH_SECRET || 'refresh_secret') as jwt.Secret, {
    expiresIn: '30d', // Long lived refresh token
  } as jwt.SignOptions);

  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
    sameSite: 'strict', // Prevent CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return accessToken;
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'user', // force standard user
    });

    // Scope newGeoData here
    let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (typeof ipAddress !== 'string') ipAddress = ipAddress[0];
    const geo = geoip.lookup(ipAddress);
    
    const newGeoData = {
      ip: ipAddress,
      country: geo?.country || 'Unknown',
      state: geo?.region || 'Unknown',
      city: geo?.city || 'Unknown',
      latitude: geo?.ll?.[0],
      longitude: geo?.ll?.[1],
    };

    if (user) {
      // Record Traffic Location
      await TrafficLog.create({
        userId: user._id,
        pageVisited: '/register',
        deviceType: req.headers['user-agent'] || 'Unknown',
        browser: req.headers['user-agent'] || 'Unknown',
        geoData: newGeoData
      });

      // Assign initial geoData to User model for quick referencing
      user.geoData = newGeoData;
      await user.save();
    }
    
    // Generate welcome notification async
    Notification.create({
      user: user._id,
      title: 'Welcome to Open Theatre! 🍿',
      message: 'Explore our vast library of independent short films and movies.',
      targetUrl: '/movies'
    }).catch(err => console.error("Error creating welcome notification:", err));

    if (user) {
      const accessToken = generateTokens(res, user._id as unknown as string, user.role);
      
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: accessToken,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup', error });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      try {
        // Record Traffic Location on login safely
        let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        if (typeof ipAddress !== 'string') ipAddress = ipAddress[0];
        const geo = geoip.lookup(ipAddress);
        
        const newGeoData = {
          ip: ipAddress,
          country: geo?.country || 'Unknown',
          state: geo?.region || 'Unknown',
          city: geo?.city || 'Unknown',
          latitude: geo?.ll?.[0],
          longitude: geo?.ll?.[1],
        };

        if(!user.geoData?.ip) {
          user.geoData = newGeoData;
          await user.save();
        }

        await TrafficLog.create({
          userId: user._id,
          pageVisited: '/login',
          deviceType: req.headers['user-agent'] || 'Unknown',
          browser: req.headers['user-agent'] || 'Unknown',
          geoData: newGeoData
        });
      } catch (logErr) {
        console.error("TrafficLog or GeoData save failed during login (non-fatal):", logErr);
      }

      const accessToken = generateTokens(res, user._id as unknown as string, user.role);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: accessToken,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error("FATAL LOGIN ERROR TRACE:", error);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.jwt;
    if (!refreshToken) {
      res.status(401).json({ message: 'Not authorized, no refresh token' });
      return;
    }

    const decoded = jwt.verify(refreshToken, (process.env.JWT_REFRESH_SECRET || 'refresh_secret') as jwt.Secret) as any;
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const accessToken = jwt.sign({ id: user._id, role: user.role }, (process.env.JWT_SECRET || 'secret') as jwt.Secret, {
      expiresIn: '30d',
    } as jwt.SignOptions);

    res.json({ token: accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
