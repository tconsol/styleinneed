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
    const user = await User.findById(decoded.userId)
      .select('-password -refreshTokens -otp -otpExpiry')
      .populate('roleRef', 'permissions isActive name');
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

// 'admin' has full control. 'manager' is a staff account limited to the
// features an admin grants it — the same per-feature model as providers.
export const isAdmin = restrictTo('admin');
// Account/role management and destructive admin actions stay admin-only, so a
// manager can never widen their own access.
export const isSuperAdmin = restrictTo('admin');
// Admin-only. Managers reach individual areas through `adminOrFeature` grants,
// never wholesale — otherwise adding the role would silently widen access to
// every route that used this guard.
export const isAdminOrManager = restrictTo('admin');
// Providers (suppliers) may add/edit their own products — everything beyond
// that is opt-in per provider via `adminOrFeature`.
export const isProviderOrAdmin = restrictTo('admin', 'manager', 'provider');
export const isProvider = restrictTo('provider');
// Any non-customer staff account. Used for shared, low-risk endpoints like the
// image uploader, which every content page needs regardless of which specific
// feature grant brought them there.
export const isAnyStaff = restrictTo('admin', 'manager', 'provider');

/**
 * Everything a non-admin account can do, resolved fresh per request: the
 * permissions of the role it holds plus any direct grants. Reading the role at
 * request time means editing a role takes effect immediately for everyone
 * holding it, with no re-login.
 */
export const effectivePermissions = (user?: AuthRequest['user']): string[] => {
  if (!user) return [];
  const role = user.roleRef as unknown as { permissions?: string[]; isActive?: boolean } | undefined;
  const fromRole = role && role.isActive !== false ? role.permissions || [] : [];
  return [...new Set([...fromRole, ...(user.permissions || [])])];
};

/**
 * Admins always pass. Staff and providers pass only when the feature is in
 * their effective permissions. Customers never pass.
 */
export const adminOrFeature = (feature: string) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin') { next(); return; }
    const scoped = req.user?.role === 'manager' || req.user?.role === 'provider';
    if (scoped && effectivePermissions(req.user).includes(feature)) { next(); return; }
    sendError(res, 'Forbidden: insufficient permissions', 403);
  };
