import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../types';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOtp, generateSecureToken, hashToken } from '../utils/otp';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/email.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { primaryClientUrl } from '../middleware/security';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);

    const user = await User.create({ name, email, password, phone, otp, otpExpiry });
    await sendOtpEmail(email, otp, name);

    sendSuccess(res, 'Registration successful. Check email for OTP.', { userId: user._id }, 201);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.isEmailVerified) {
      sendError(res, 'Email already verified', 400);
      return;
    }

    if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      sendError(res, 'Invalid or expired OTP', 400);
      return;
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    sendSuccess(res, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
};

export const resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.isEmailVerified) {
      sendError(res, 'Email already verified', 400);
      return;
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOtpEmail(email, otp, user.name);
    sendSuccess(res, 'OTP resent successfully');
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    if (!user.isEmailVerified) {
      sendError(res, 'Please verify your email first', 403);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'Account is deactivated', 403);
      return;
    }

    const payload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      resource: 'auth',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    sendSuccess(res, 'Login successful', {
      accessToken,
      refreshToken,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      sendError(res, 'Refresh token required', 400);
      return;
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user || !user.refreshTokens?.includes(token)) {
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    const payload = { userId: user._id.toString(), role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    sendSuccess(res, 'Token refreshed', { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    sendError(res, 'Invalid or expired refresh token', 401);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (req.user && token) {
      const user = await User.findById(req.user._id).select('+refreshTokens');
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== token);
        await user.save();
      }
    }
    sendSuccess(res, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      sendSuccess(res, 'If that email exists, a reset link has been sent');
      return;
    }

    const token = generateSecureToken();
    user.passwordResetToken = hashToken(token);
    user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = `${primaryClientUrl()}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl, user.name);

    sendSuccess(res, 'If that email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpiry: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpiry +refreshTokens');

    if (!user) {
      sendError(res, 'Invalid or expired reset token', 400);
      return;
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshTokens = [];
    await user.save();

    sendSuccess(res, 'Password reset successful');
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, 'User profile', req.user);
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { name, phone },
      { new: true, runValidators: true }
    );
    sendSuccess(res, 'Profile updated', user);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!._id).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(currentPassword))) {
      sendError(res, 'Current password is incorrect', 400);
      return;
    }
    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();
    sendSuccess(res, 'Password changed successfully. Please login again.');
  } catch (err) {
    next(err);
  }
};

export const manageAddresses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) { sendError(res, 'User not found', 404); return; }

    const { action, addressId, address } = req.body;

    if (action === 'add') {
      if (address.isDefault) {
        user.addresses.forEach((a) => (a.isDefault = false));
      }
      user.addresses.push(address);
    } else if (action === 'update' && addressId) {
      const idx = user.addresses.findIndex((a) => a._id?.toString() === addressId);
      if (idx === -1) { sendError(res, 'Address not found', 404); return; }
      if (address.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
      Object.assign(user.addresses[idx], address);
    } else if ((action === 'remove' || action === 'delete') && addressId) {
      user.addresses = user.addresses.filter((a) => a._id?.toString() !== addressId);
    } else if (action === 'setDefault' && addressId) {
      user.addresses.forEach((a) => (a.isDefault = a._id?.toString() === addressId));
    }

    await user.save();
    sendSuccess(res, 'Addresses updated', user.addresses);
  } catch (err) {
    next(err);
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) { sendError(res, 'Google credential required', 400); return; }

    // credential is an OAuth2 access_token (from @react-oauth/google web or expo-auth-session mobile)
    const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${credential}`);
    if (!userInfoRes.ok) { sendError(res, 'Invalid Google token', 401); return; }
    const payload = await userInfoRes.json() as { email?: string; name?: string; picture?: string; id?: string };
    if (!payload.email) { sendError(res, 'Invalid Google token', 401); return; }

    const { email, name, picture, id: googleId } = payload;

    let user = await User.findOne({ email }).select('+refreshTokens');
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar: picture,
        isEmailVerified: true,
        isActive: true,
        password: crypto.randomBytes(32).toString('hex'),
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    if (!user.isActive) { sendError(res, 'Account is deactivated', 403); return; }

    const tokenPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await user.save();

    sendSuccess(res, 'Google login successful', {
      accessToken,
      refreshToken,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
};
