import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { validateAccountStatus } from '../services/user/authService.js';

dotenv.config();


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          const validation = validateAccountStatus(user);
          if (!validation.isValid) {
            req.session.error = validation.message;
            return done(null, false);
          }
          return done(null, user);
        }

        
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          const validation = validateAccountStatus(user);
          if (!validation.isValid) {
            req.session.error = validation.message;
            return done(null, false);
          }

          
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }

        
        user = new User({
          fullName: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          profileImage: profile.photos[0].value,
          role: 'user',
          isActive: true,
        });

        await user.save();
        return done(null, user);

      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;