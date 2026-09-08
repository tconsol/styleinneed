import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest, JwtPayload, UserRole } from '../types';
import { sendError } from '../utils/apiResponse';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : undefined;

  if (!token) {
    sendError(res, 'Not authorized, no token', 401);
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const user = await User.findById(decoded.userId).select('-password -refreshTokens -otp -otpExpiry');
    if (!user || !user.isActive) {
      sendError(res, 'User not found or inactive', 401);
      return;
    }
    req.user = user;
    next();
  } catch {
    sendError(res, 'Not authorized, invalid token', 401);
  }
};

/**
 * Populates `req.user` when a valid token is present, but lets the request
 * through when it isn't. Used by the checkout routes, which serve both
 * signed-in shoppers and guests. An invalid/expired token is treated as "no
 * user" rather than an error so a stale token can't block a guest purchase.
 */
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : undefined;
  if (!token) { next(); return; }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const user = await User.findById(decoded.userId).select('-password -refreshTokens -otp -otpExpiry');
    if (user && user.isActive) req.user = user;
  } catch {
    /* fall through as a guest */
  }
  next();
};

export const restrictTo = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: insufficient permissions', 403);
      return;
    }
    next();
  };

// Single staff role: 'admin' has full control. Aliases kept so existing route
// imports keep working without churn.
export const isAdmin = restrictTo('admin');
export const isSuperAdmin = restrictTo('admin');
export const isAdminOrManager = restrictTo('admin');
// Providers (suppliers) may add/edit their own products — everything beyond
// that is opt-in per provider via `adminOrFeature`.
export const isProviderOrAdmin = restrictTo('admin', 'provider');
export const isProvider = restrictTo('provider');

/**
 * Admins always pass. Providers pass only when the admin has granted them this
 * feature (see config/providerFeatures.ts). Customers never pass.
 */
export const adminOrFeature = (feature: string) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin') { next(); return; }
    if (req.user?.role === 'provider' && (req.user.permissions || []).includes(feature)) { next(); return; }
    sendError(res, 'Forbidden: insufficient permissions', 403);
  };
