import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '@/config/env';
import { loginWithGoogle } from '@/services/auth.service';

let isConfigured = false;

export function configurePassport() {
  if (isConfigured) {
    return;
  }

  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_CALLBACK_URL
  ) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            done(new Error('Google account email is required.'));
            return;
          }

          const session = await loginWithGoogle({
            googleId: profile.id,
            email,
            name:
              profile.displayName?.trim() ||
              email.split('@')[0] ||
              'Google User',
            profileImageUrl: profile.photos?.[0]?.value ?? null,
          });

          done(null, session.user, {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
          });
        } catch (error) {
          done(
            error instanceof Error
              ? error
              : new Error('Google authentication failed.'),
          );
        }
      },
    ),
  );

  isConfigured = true;
}