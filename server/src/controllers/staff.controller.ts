import { Response, NextFunction, Request } from 'express';
import crypto from 'crypto';
import slugify from 'slugify';
import User from '../models/User';
import Role from '../models/Role';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { sanitizeFeatures, PROVIDER_FEATURES } from '../config/providerFeatures';

/* ───────────────────────── Roles ───────────────────────── */

/** The feature catalogue an admin ticks when building a role. */
export const getFeatureCatalogue = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, 'Features', PROVIDER_FEATURES);
};

export const listRoles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await Role.find().sort('name').lean();
    // How many staff hold each role — lets the UI warn before a destructive edit.
    const counts = await User.aggregate<{ _id: unknown; count: number }>([
      { $match: { roleRef: { $ne: null } } },
      { $group: { _id: '$roleRef', count: { $sum: 1 } } },
    ]);
    const byRole = new Map(counts.map((c) => [String(c._id), c.count]));
    sendSuccess(res, 'Roles', roles.map((r) => ({ ...r, staffCount: byRole.get(String(r._id)) || 0 })));
  } catch (err) {
    next(err);
  }
};

export const createRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, permissions } = req.body as { name?: string; description?: string; permissions?: unknown };
    if (!name?.trim()) { sendError(res, 'Role name is required', 400); return; }

    const slug = slugify(name, { lower: true, strict: true });
    if (await Role.exists({ slug })) { sendError(res, 'A role with that name already exists', 409); return; }

    const role = await Role.create({
      name: name.trim(),
      slug,
      description: description?.trim(),
      permissions: sanitizeFeatures(permissions),
      createdBy: req.user!._id,
    });

    await AuditLog.create({
      user: req.user!._id, action: 'CREATE_ROLE', resource: 'role',
      resourceId: role._id.toString(), changes: { name: role.name, permissions: role.permissions },
    });

    sendSuccess(res, 'Role created', role, 201);
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) { sendError(res, 'Role not found', 404); return; }

    const { name, description, permissions, isActive } = req.body as {
      name?: string; description?: string; permissions?: unknown; isActive?: boolean;
    };

    if (name?.trim() && name.trim() !== role.name) {
      const slug = slugify(name, { lower: true, strict: true });
      if (await Role.exists({ slug, _id: { $ne: role._id } })) {
        sendError(res, 'A role with that name already exists', 409); return;
      }
      role.name = name.trim();
      role.slug = slug;
    }
    if (description !== undefined) role.description = description?.trim();
    if (permissions !== undefined) role.permissions = sanitizeFeatures(permissions);
    if (isActive !== undefined) role.isActive = !!isActive;
    await role.save();

    await AuditLog.create({
      user: req.user!._id, action: 'UPDATE_ROLE', resource: 'role',
      resourceId: role._id.toString(), changes: { name: role.name, permissions: role.permissions, isActive: role.isActive },
    });

    sendSuccess(res, 'Role updated', role);
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) { sendError(res, 'Role not found', 404); return; }
    if (role.isSystem) { sendError(res, 'Built-in roles cannot be deleted', 400); return; }

    // Refuse while staff still hold it — otherwise they'd silently lose all
    // access with no trace of why.
    const holders = await User.countDocuments({ roleRef: role._id });
    if (holders > 0) {
      sendError(res, `${holders} staff member(s) still hold this role. Reassign them first.`, 400);
      return;
    }

    await role.deleteOne();
    await AuditLog.create({
      user: req.user!._id, action: 'DELETE_ROLE', resource: 'role',
      resourceId: role._id.toString(), changes: { name: role.name },
    });
    sendSuccess(res, 'Role deleted');
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────── Staff ───────────────────────── */

const STAFF_ROLES = ['admin', 'manager'];

export const listStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = { role: { $in: STAFF_ROLES } };
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const [staff, total] = await Promise.all([
      User.find(filter)
        .select('name email phone role isActive isEmailVerified createdAt roleRef permissions')
        .populate('roleRef', 'name slug permissions isActive')
        .sort('-createdAt').skip(skip).limit(l).lean(),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, 'Staff', staff, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    next(err);
  }
};

export const createStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, password, roleId, isAdmin } = req.body as {
      name?: string; email?: string; phone?: string; password?: string; roleId?: string; isAdmin?: boolean;
    };

    if (!name?.trim() || !email?.trim()) { sendError(res, 'Name and email are required', 400); return; }
    if (!password || password.length < 8) { sendError(res, 'Set a password of at least 8 characters', 400); return; }

    const normalised = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalised });
    if (existing) { sendError(res, 'An account with that email already exists', 409); return; }

    // A full admin needs no role; a manager must have one, or they'd sign in
    // to an empty panel.
    let roleRef: string | undefined;
    if (!isAdmin) {
      if (!roleId) { sendError(res, 'Pick a role for this staff member', 400); return; }
      const role = await Role.findById(roleId);
      if (!role) { sendError(res, 'Role not found', 404); return; }
      roleRef = String(role._id);
    }

    const user = await User.create({
      name: name.trim(),
      email: normalised,
      phone,
      password,
      role: isAdmin ? 'admin' : 'manager',
      roleRef,
      // Staff are created by an admin, so there's no email to verify.
      isEmailVerified: true,
      isActive: true,
    });

    await AuditLog.create({
      user: req.user!._id, action: 'CREATE_STAFF', resource: 'user',
      resourceId: user._id.toString(), changes: { email: user.email, role: user.role, roleRef },
    });

    sendSuccess(res, 'Staff account created', {
      _id: user._id, name: user.name, email: user.email, role: user.role,
    }, 201);
  } catch (err) {
    next(err);
  }
};

export const updateStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { sendError(res, 'Staff member not found', 404); return; }
    if (!STAFF_ROLES.includes(user.role)) { sendError(res, 'That account is not a staff member', 400); return; }

    const { name, phone, roleId, isAdmin, isActive } = req.body as {
      name?: string; phone?: string; roleId?: string | null; isAdmin?: boolean; isActive?: boolean;
    };

    // Don't let an admin lock themselves out of their own panel.
    const isSelf = String(user._id) === String(req.user!._id);
    if (isSelf && (isActive === false || isAdmin === false)) {
      sendError(res, 'You cannot downgrade or deactivate your own account', 400);
      return;
    }

    if (name?.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = !!isActive;

    if (isAdmin !== undefined) {
      user.role = isAdmin ? 'admin' : 'manager';
      // A full admin has implicit access to everything, so a role would be
      // misleading; a manager must keep one.
      if (isAdmin) user.roleRef = undefined;
    }
    if (!isAdmin && roleId) {
      const role = await Role.findById(roleId);
      if (!role) { sendError(res, 'Role not found', 404); return; }
      user.roleRef = role._id;
    }
    if (user.role === 'manager' && !user.roleRef) {
      sendError(res, 'A manager must have a role assigned', 400); return;
    }

    await user.save();

    await AuditLog.create({
      user: req.user!._id, action: 'UPDATE_STAFF', resource: 'user',
      resourceId: user._id.toString(), changes: { role: user.role, roleRef: user.roleRef, isActive: user.isActive },
    });

    sendSuccess(res, 'Staff member updated', user);
  } catch (err) {
    next(err);
  }
};

/** Admin-set password reset — the new password is shown once, never stored in the clear. */
export const resetStaffPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) { sendError(res, 'Staff member not found', 404); return; }
    if (!STAFF_ROLES.includes(user.role)) { sendError(res, 'That account is not a staff member', 400); return; }

    const supplied = String(req.body.password || '');
    if (supplied && supplied.length < 8) { sendError(res, 'Password must be at least 8 characters', 400); return; }
    const password = supplied || crypto.randomBytes(9).toString('base64url');

    user.password = password;
    // Force every existing session out — a reset should end them.
    user.refreshTokens = [];
    await user.save();

    await AuditLog.create({
      user: req.user!._id, action: 'RESET_STAFF_PASSWORD', resource: 'user',
      resourceId: user._id.toString(), changes: { email: user.email },
    });

    sendSuccess(res, 'Password reset. Share it with them now — it is not stored.', { password });
  } catch (err) {
    next(err);
  }
};

export const deleteStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { sendError(res, 'Staff member not found', 404); return; }
    if (!STAFF_ROLES.includes(user.role)) { sendError(res, 'That account is not a staff member', 400); return; }
    if (String(user._id) === String(req.user!._id)) {
      sendError(res, 'You cannot delete your own account', 400); return;
    }
    // Never leave the panel without an administrator.
    if (user.role === 'admin' && (await User.countDocuments({ role: 'admin', isActive: true })) <= 1) {
      sendError(res, 'This is the last active admin account', 400); return;
    }

    await user.deleteOne();
    await AuditLog.create({
      user: req.user!._id, action: 'DELETE_STAFF', resource: 'user',
      resourceId: user._id.toString(), changes: { email: user.email, role: user.role },
    });
    sendSuccess(res, 'Staff member removed');
  } catch (err) {
    next(err);
  }
};
