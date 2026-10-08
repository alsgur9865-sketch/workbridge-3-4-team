import { Router } from 'express';
import {
  loginController,
  logoutController,
  refreshController,
  signupController,
} from '@/controllers/auth.controller';

export const authRouter = Router();

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
