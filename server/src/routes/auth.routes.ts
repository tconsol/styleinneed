import { Router } from 'express';
import {
  register, verifyEmail, resendOtp, login, refreshToken, logout,
  forgotPassword, resetPassword, getMe, updateProfile, changePassword, manageAddresses, googleAuth,
  requestEmailChange, verifyEmailChange,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/security';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

router.post('/google', authLimiter, googleAuth);
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/verify-email', otpLimiter, validate(otpSchema), verifyEmail);
router.post('/resend-otp', otpLimiter, resendOtp);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

router.get('/me', protect, getMe);
router.patch('/me', protect, updateProfile);
router.post('/change-email/request', protect, authLimiter, requestEmailChange);
router.post('/change-email/verify', protect, verifyEmailChange);
router.patch('/change-password', protect, changePassword);
router.post('/addresses', protect, manageAddresses);

export default router;
