import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export type AuthRequest = Request;

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

      req.user = await User.findById(decoded.id).select('-password') as IUser;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const requireRole = (roles: Array<'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user && roles.includes(req.user.role as any)) {
      next();
    } else {
      res.status(403).json({ message: `Access denied. Requires one of: ${roles.join(', ')}` });
    }
  };
};
