import { Router } from 'express';
import { signupController } from '@/controllers/auth.controller';

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
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 72
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Email already registered
 */
authRouter.post('/signup', signupController);
