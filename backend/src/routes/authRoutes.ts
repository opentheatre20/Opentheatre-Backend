import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser, refreshAccessToken } from '../controllers/authController';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);

// Google OAuth
router.get('/google', (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_failed` }), (req, res) => {
  const user = req.user as any;
  const accessToken = jwt.sign({ id: user._id, role: user.role }, (process.env.JWT_SECRET || 'secret') as jwt.Secret, { expiresIn: '15m' } as jwt.SignOptions);
  
  const refreshToken = jwt.sign({ id: user._id, role: user.role }, (process.env.JWT_REFRESH_SECRET || 'refresh_secret') as jwt.Secret, { expiresIn: '7d' } as jwt.SignOptions);
  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&userId=${user._id}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${user.role}`);
});
export default router;
