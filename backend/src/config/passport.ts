import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';

export const configurePassport = () => {
  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'missing_client_id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing_client_secret',
        callbackURL: '/api/auth/google/callback',
        proxy: true,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email found'), undefined);

          let user = await User.findOne({ email });

          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email,
              provider: 'google',
              providerId: profile.id,
              role: 'user',
            });
          } else if (!user.provider || user.provider === 'local') {
            user.provider = 'google';
            user.providerId = profile.id;
            await user.save();
          }

          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
};
