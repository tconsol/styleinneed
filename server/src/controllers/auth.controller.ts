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
import { encryptSecret } from '../utils/secretCrypto';
import { findReferrer } from '../utils/referrals';
import { effectivePermissions } from '../middleware/auth';
import { verifyToken, consumeRecoveryCode, looksLikeRecoveryCode } from '../utils/totp';
import { sendWhatsAppOtp, isWhatsAppConfigured } from '../services/whatsapp.service';
import { normalisePhone, formatPhone } from '../utils/phone';
import logger from '../utils/logger';

/**
 * Deliver a signup OTP, preferring WhatsApp when a number is given.
 *
 * WhatsApp is best-effort: a number with no WhatsApp account, an unconfigured
 * integration, or any Meta rejection falls through to email. The caller is
 * told which channel actually carried it so the UI can say so honestly rather
 * than pointing the user at an app that never received anything.
 */
const deliverSignupOtp = async (
  user: { name: string; email: string; phone?: string },
  otp: string
): Promise<{ channel: 'whatsapp' | 'email'; whatsappFailed: boolean; reason?: string }> => {
  const destination = normalisePhone(user.phone);

  if (destination && isWhatsAppConfigured()) {
    const result = await sendWhatsAppOtp(destination, otp, user.name);
    if (result.ok) return { channel: 'whatsapp', whatsappFailed: false };

    logger.warn(`WhatsApp OTP failed for ${formatPhone(destination)} — falling back to email: ${result.error}`);
    await sendOtpEmail(user.email, otp, user.name);
    // Only claim "no WhatsApp" when the number itself was rejected. A bad key
    // or a missing campaign is our problem, and blaming the user's number for
    // it would be wrong.
    // Only claim "no WhatsApp" when Meta rejected the number itself. An
    // expired token or a bad template is our problem, not the customer's.
    return {
      channel: 'email',
      whatsappFailed: result.kind === 'unreachable',
      reason: result.error,
    };
  }

  await sendOtpEmail(user.email, otp, user.name);
  return { channel: 'email', whatsappFailed: false };
};

/** Wording that matches where the code actually went. */
const otpMessage = (d: { channel: 'whatsapp' | 'email'; whatsappFailed: boolean }): string => {
  if (d.channel === 'whatsapp') return 'Verification code sent to your WhatsApp.';
  if (d.whatsappFailed) return 'That number does not have WhatsApp — we emailed your code instead.';
  return 'Registration successful. Check your email for the code.';
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, referralCode } = req.body;

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);

    const existing = await User.findOne({ email }).select('+password isGuest');
    if (existing && !existing.isGuest) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    // Someone who checked out as a guest already has a shell account holding
    // their order history — turn it into a real one instead of rejecting them.
    if (existing?.isGuest) {
      existing.name = name || existing.name;
      existing.password = password;
      if (phone) existing.phone = phone;
      existing.isGuest = false;
      existing.otp = otp;
      existing.otpExpiry = otpExpiry;
      if (!existing.referredBy) {
        const referrer = await findReferrer(referralCode);
        if (referrer && String(referrer._id) !== String(existing._id)) existing.referredBy = referrer._id;
      }
      await existing.save();
      const d = await deliverSignupOtp(existing, otp);
      sendSuccess(res, otpMessage(d), {
        userId: existing._id, otpChannel: d.channel, whatsappFailed: d.whatsappFailed,
      }, 201);
      return;
    }

    // A referral code is optional; an unknown one is simply ignored.
    const referrer = await findReferrer(referralCode);

    const user = await User.create({
      name, email, password, phone, otp, otpExpiry,
      referredBy: referrer?._id,
    });

    const d = await deliverSignupOtp(user, otp);
    sendSuccess(res, otpMessage(d), {
      userId: user._id, otpChannel: d.channel, whatsappFailed: d.whatsappFailed,
    }, 201);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry +refreshTokens');
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

    /**
     * Sign them straight in.
     *
     * Entering the emailed code already proves control of the address, so
     * demanding the password again immediately afterwards adds no security —
     * it only costs the customer a step at the least patient moment.
     *
     * Two exceptions get no session: a deactivated account, and one with a
     * second factor set up (which a brand-new signup never has, but the check
     * costs nothing and keeps this from becoming a way around 2FA).
     */
    const canAutoLogin = user.isActive && !user.twoFactorEnabled;

    if (!canAutoLogin) {
      await user.save();
      sendSuccess(res, 'Email verified. Please sign in.', { autoLogin: false });
      return;
    }

    const payload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refresh = generateRefreshToken(payload);

    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refresh];
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      resource: 'auth',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    sendSuccess(res, 'Email verified — you are signed in', {
      autoLogin: true,
      accessToken,
      refreshToken: refresh,
      user: {
        _id: user._id, name: user.name, email: user.email, role: user.role,
        avatar: user.avatar, providerRef: user.providerRef,
        twoFactorEnabled: !!user.twoFactorEnabled,
        permissions: user.role === 'admin' ? [] : effectivePermissions(user),
      },
    });
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

    // `channel: 'email'` lets the client force email after a WhatsApp miss.
    const forceEmail = req.body.channel === 'email';
    const d = forceEmail
      ? (await sendOtpEmail(email, otp, user.name), { channel: 'email' as const, whatsappFailed: false })
      : await deliverSignupOtp(user, otp);

    sendSuccess(res, otpMessage(d), { otpChannel: d.channel, whatsappFailed: d.whatsappFailed });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, totp } = req.body;

    const user = await User.findOne({ email })
      .select('+password +refreshTokens +twoFactorSecret +twoFactorRecoveryCodes +twoFactorLastCode +twoFactorLastUsedAt')
      .populate('roleRef', 'permissions isActive name');
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

    // Second factor. The password is already correct at this point, so the
    // client is told to collect a code — that disclosure is unavoidable and
    // costs nothing an attacker who guessed the password doesn't already know.
    if (user.twoFactorEnabled) {
      const code = String(totp || '').trim();
      if (!code) {
        sendError(res, 'Enter the code from your authenticator app', 401, { twoFactorRequired: true });
        return;
      }

      if (looksLikeRecoveryCode(code)) {
        const remaining = consumeRecoveryCode(user.twoFactorRecoveryCodes, code);
        if (!remaining) {
          sendError(res, 'That code is not valid', 401, { twoFactorRequired: true });
          return;
        }
        user.twoFactorRecoveryCodes = remaining; // single use
      } else {
        // A TOTP stays valid for its whole step, so refuse one already spent.
        const replayed = user.twoFactorLastCode === code
          && !!user.twoFactorLastUsedAt
          && Date.now() - user.twoFactorLastUsedAt.getTime() < 90_000;

        if (replayed || !(await verifyToken(user.twoFactorSecret, code))) {
          sendError(res, 'That code is not valid', 401, { twoFactorRequired: true });
          return;
        }
        user.twoFactorLastCode = code;
        user.twoFactorLastUsedAt = new Date();
      }
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
      user: {
        _id: user._id, name: user.name, email: user.email, role: user.role,
        avatar: user.avatar, providerRef: user.providerRef,
        twoFactorEnabled: !!user.twoFactorEnabled,
        // Drives which admin pages a scoped staff/provider login can open —
        // resolved from their role plus any direct grants.
        permissions: user.role === 'admin' ? [] : effectivePermissions(user),
        roleName: (user.roleRef as unknown as { name?: string } | undefined)?.name,
      },
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
  const user = req.user!;
  // Flatten the role into `permissions` so the client has one place to look,
  // whether the grants came from a role or directly.
  sendSuccess(res, 'User profile', {
    ...user.toObject(),
    permissions: user.role === 'admin' ? [] : effectivePermissions(user),
    roleName: (user.roleRef as unknown as { name?: string } | undefined)?.name,
  });
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

// Step 1 — admin requests an email change: OTP is sent to the NEW address to prove ownership.
export const requestEmailChange = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { sendError(res, 'Only admins can change their email', 403); return; }

    const newEmail = String(req.body.newEmail || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { sendError(res, 'Enter a valid email address', 400); return; }
    if (newEmail === req.user!.email.toLowerCase()) { sendError(res, 'This is already your email', 400); return; }

    const taken = await User.findOne({ email: newEmail });
    if (taken) { sendError(res, 'Email already in use', 409); return; }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + Number(process.env.OTP_EXPIRES_IN || 10) * 60 * 1000);

    const user = await User.findById(req.user!._id).select('+emailChangeOtp +emailChangeOtpExpiry +pendingEmail');
    if (!user) { sendError(res, 'User not found', 404); return; }
    user.pendingEmail = newEmail;
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpiry = otpExpiry;
    await user.save();

    await sendOtpEmail(newEmail, otp, user.name);
    sendSuccess(res, `Verification code sent to ${newEmail}`);
  } catch (err) {
    next(err);
  }
};

// Step 2 — admin confirms the OTP; the pending email becomes the account email.
export const verifyEmailChange = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { sendError(res, 'Only admins can change their email', 403); return; }

    const { otp } = req.body;
    const user = await User.findById(req.user!._id).select('+emailChangeOtp +emailChangeOtpExpiry +pendingEmail');
    if (!user || !user.pendingEmail) { sendError(res, 'No pending email change', 400); return; }
    if (!user.emailChangeOtp || user.emailChangeOtp !== otp || !user.emailChangeOtpExpiry || user.emailChangeOtpExpiry < new Date()) {
      sendError(res, 'Invalid or expired OTP', 400);
      return;
    }

    // Guard against the address being claimed in the window between request and verify.
    const taken = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } });
    if (taken) { sendError(res, 'Email already in use', 409); return; }

    user.email = user.pendingEmail;
    user.isEmailVerified = true;
    user.pendingEmail = undefined;
    user.emailChangeOtp = undefined;
    user.emailChangeOtpExpiry = undefined;
    await user.save();

    sendSuccess(res, 'Email updated successfully', user);
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
    // Provider accounts are admin-managed, so keep the admin-viewable copy in
    // sync — stored encrypted (AES-256-GCM), never as cleartext.
    if (user.role === 'provider') user.plainPassword = encryptSecret(newPassword);
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
