import { Router } from 'express';
import passport from 'passport';
import {
  googleCallbackController,
  loginController,
  logoutController,
  refreshController,
  selectRoleController,
  signupController,
} from '@/controllers/auth.controller';
import { requireAuth } from '@/middlewares/auth.middleware';

export const authRouter = Router();

/**
 * @openapi
 * /auth/google:
 *   get:
 *     summary: Start Google OAuth sign in
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google sign in
 */
authRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Google authentication completed and redirected to frontend
 *       401:
 *         description: Google authentication failed
 */
authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
  }),
  googleCallbackController,
);

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Create a local WorkBridge account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 72 }
 *               name: { type: string }
 *     responses:
 *       201: { description: Account created }
 *       400: { description: Invalid request data }
 *       409: { description: Email already registered }
 */
authRouter.post('/signup', signupController);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Sign in with email and password
 *     tags: [Auth]
 *     responses:
 *       200: { description: Signed in }
 *       401: { description: Invalid credentials }
 */
authRouter.post('/login', loginController);

/**
 * @openapi
 * /auth/role:
 *   patch:
 *     summary: Select the role for a newly registered user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [CLIENT, FREELANCER] }
 *     responses:
 *       200: { description: Role selected and session tokens reissued }
 *       400: { description: Invalid role }
 *       401: { description: Not authenticated }
 *       409: { description: Role already selected }
 */
authRouter.patch('/role', requireAuth, selectRoleController);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token and issue a new access token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Session refreshed }
 *       401: { description: Refresh token missing or invalid }
 */
authRouter.post('/refresh', refreshController);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Clear the current refresh session
 *     tags: [Auth]
 *     responses:
 *       200: { description: Signed out }
 */
authRouter.post('/logout', logoutController);