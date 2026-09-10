import { Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { createSecret, otpauthUri, verifyToken, createRecoveryCodes } from '../utils/totp';


const audit = (req: AuthRequest, action: string) =>
  AuditLog.create({
    user: req.user!._id,
    action,
    resource: 'auth',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(() => {});

/** Whether the signed-in account has 2FA on, and how much fallback is left. */
export const getTwoFactorStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('+twoFactorSecret +twoFactorRecoveryCodes');
    if (!user) { sendError(res, 'User not found', 404); return; }

    sendSuccess(res, 'Two-factor status', {
      enabled: !!user.twoFactorEnabled,
      // A secret written but not yet confirmed — the setup was abandoned midway.
      pendingSetup: !user.twoFactorEnabled && !!user.twoFactorSecret,
      enabledAt: user.twoFactorEnabledAt,
      recoveryCodesRemaining: user.twoFactorEnabled ? (user.twoFactorRecoveryCodes || []).length : 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Step 1 — mint a secret and hand back the QR. Nothing changes about login
 * until `enableTwoFactor` confirms a code from the app, so re-running this is
 * safe and simply replaces an abandoned setup.
 */
export const startTwoFactorSetup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('+twoFactorSecret');
    if (!user) { sendError(res, 'User not found', 404); return; }

    if (user.twoFactorEnabled) {
      sendError(res, 'Two-factor is already enabled. Disable it first to re-enrol.', 409);
      return;
    }

    const { secret, encrypted } = createSecret();
    user.twoFactorSecret = encrypted;
    await user.save();

    const uri = otpauthUri(secret, user.email);

    sendSuccess(res, 'Scan this in your authenticator app', {
      secret,               // shown so the code can be typed in by hand
      otpauthUrl: uri,
      qrDataUrl: await QRCode.toDataURL(uri, { width: 240, margin: 1 }),
    });
  } catch (err) {
    next(err);
  }
};

/** Step 2 — a valid code proves the app is enrolled; only then does 2FA bind. */
export const enableTwoFactor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user!._id).select('+twoFactorSecret +twoFactorRecoveryCodes');
    if (!user) { sendError(res, 'User not found', 404); return; }

    if (user.twoFactorEnabled) { sendError(res, 'Two-factor is already enabled', 409); return; }
    if (!user.twoFactorSecret) { sendError(res, 'Start the setup first', 400); return; }

    if (!(await verifyToken(user.twoFactorSecret, String(token || '')))) {
      sendError(res, 'That code is not valid. Check your device clock and try the current code.', 400);
      return;
    }

    const { codes, hashes } = createRecoveryCodes();
    user.twoFactorEnabled = true;
    user.twoFactorEnabledAt = new Date();
    user.twoFactorRecoveryCodes = hashes;
    await user.save();

    await audit(req, '2FA_ENABLED');

    // The only time the plain codes exist outside the user's hands.
    sendSuccess(res, 'Two-factor authentication is on', { recoveryCodes: codes });
  } catch (err) {
    next(err);
  }
};

/**
 * Turning 2FA off needs both the password and a live code — an unlocked,
 * unattended session should not be enough to strip the second factor.
 */
export const disableTwoFactor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password, token } = req.body;
    const user = await User.findById(req.user!._id).select('+password +twoFactorSecret +twoFactorRecoveryCodes');
    if (!user) { sendError(res, 'User not found', 404); return; }

    if (!user.twoFactorEnabled) { sendError(res, 'Two-factor is not enabled', 400); return; }
    if (!password || !(await user.comparePassword(password))) {
      sendError(res, 'Password is incorrect', 401);
      return;
    }
    if (!(await verifyToken(user.twoFactorSecret, String(token || '')))) {
      sendError(res, 'That code is not valid', 400);
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = [];
    user.twoFactorEnabledAt = undefined;
    user.twoFactorLastCode = undefined;
    user.twoFactorLastUsedAt = undefined;
    await user.save();

    await audit(req, '2FA_DISABLED');
    sendSuccess(res, 'Two-factor authentication is off');
  } catch (err) {
    next(err);
  }
};

/** Reissue the fallback codes; every old one stops working immediately. */
export const regenerateRecoveryCodes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user!._id).select('+twoFactorSecret +twoFactorRecoveryCodes');
    if (!user) { sendError(res, 'User not found', 404); return; }
    if (!user.twoFactorEnabled) { sendError(res, 'Two-factor is not enabled', 400); return; }

    if (!(await verifyToken(user.twoFactorSecret, String(token || '')))) {
      sendError(res, 'That code is not valid', 400);
      return;
    }

    const { codes, hashes } = createRecoveryCodes();
    user.twoFactorRecoveryCodes = hashes;
    await user.save();

    await audit(req, '2FA_RECOVERY_CODES_REGENERATED');
    sendSuccess(res, 'New recovery codes issued — the old ones no longer work', { recoveryCodes: codes });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin escape hatch: clear 2FA on a staff account whose device is lost and
 * whose recovery codes are gone. Deliberately admin-only and audited, since it
 * removes a factor from someone else's account.
 */
export const resetStaffTwoFactor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) { sendError(res, 'User not found', 404); return; }
    if (target.role === 'customer') { sendError(res, 'Not a staff account', 400); return; }
    if (String(target._id) === String(req.user!._id)) {
      sendError(res, 'Use the security page to manage your own two-factor', 400);
      return;
    }

    target.twoFactorEnabled = false;
    target.twoFactorSecret = undefined;
    target.twoFactorRecoveryCodes = [];
    target.twoFactorEnabledAt = undefined;
    await target.save();

    await AuditLog.create({
      user: req.user!._id,
      action: '2FA_RESET_BY_ADMIN',
      resource: 'user',
      resourceId: target._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    sendSuccess(res, `Two-factor cleared for ${target.email}. They should re-enrol at next sign-in.`);
  } catch (err) {
    next(err);
  }
};
