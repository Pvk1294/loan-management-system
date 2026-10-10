import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/authenticate';
import * as authController from './auth.controller';

/** Slows down password guessing: 100 attempts per IP every 15 minutes. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again in a few minutes.' } },
});

export const authRouter = Router();

authRouter.post('/signup', authLimiter, authController.signup);
authRouter.post('/login', authLimiter, authController.login);
authRouter.get('/me', authenticate, authController.me);
