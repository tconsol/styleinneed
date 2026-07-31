import { Request, Response, NextFunction } from 'express';
import Provider, { IProvider } from '../models/Provider';
import User from '../models/User';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

// Business fields a provider may edit on their own record. Login/isActive/category
// stay admin-controlled (category gates catalogue placement).
const PROVIDER_EDITABLE = [
  'contactPerson', 'phone', 'email', 'address', 'city', 'state',
  'gstin', 'bankAccountName', 'bankAccountNumber', 'bankIfsc', 'bankName',
] as const;

interface LoginOpts { loginEmail?: string; loginPassword?: string; canLogin?: boolean }

// Strip the login-only fields from a provider payload so they never land on the
// Provider (business) document — credentials live on the linked User account.
const splitLogin = (body: Record<string, unknown>): { data: Record<string, unknown>; login: LoginOpts } => {
  const { loginEmail, loginPassword, canLogin, ...data } = body as LoginOpts & Record<string, unknown>;
  return { data, login: { loginEmail, loginPassword, canLogin } };
};

/** Create/update/disable the provider's admin-panel login (role 'provider'). */
const syncProviderLogin = async (provider: IProvider, opts: LoginOpts): Promise<void> => {
  const { loginEmail, loginPassword, canLogin } = opts;
  let user = await User.findOne({ providerRef: provider._id, role: 'provider' }).select('+plainPassword +password');

  if (canLogin === false) {
    if (user) { user.isActive = false; await user.save(); }
    return;
  }

  if (!user) {
    if (!loginEmail || !loginPassword) return; // need both to create the account
    user = new User({
      name: provider.name,
      email: String(loginEmail).toLowerCase().trim(),
      password: loginPassword,
      plainPassword: loginPassword,
      role: 'provider',
      providerRef: provider._id,
      isEmailVerified: true,
      isActive: true,
    });
    await user.save();
    return;
  }

  if (loginEmail) user.email = String(loginEmail).toLowerCase().trim();
  if (loginPassword) { user.password = loginPassword; user.plainPassword = loginPassword; }
  if (canLogin === true) user.isActive = true;
  await user.save();
};

// Attach { login: { email, password, active, hasLogin } } to provider records.
const attachLogin = async <T extends { _id: unknown }>(providers: T[]) => {
  const ids = providers.map((p) => p._id);
  const users = await User.find({ role: 'provider', providerRef: { $in: ids } })
    .select('email plainPassword providerRef isActive').lean();
  const map = new Map(users.map((u) => [String(u.providerRef), u]));
  return providers.map((p) => {
    const u = map.get(String(p._id));
    return {
      ...p,
      login: u
        ? { email: u.email, password: u.plainPassword || '', active: u.isActive, hasLogin: true }
        : { hasLogin: false, active: false },
    };
  });
};

export const getProviders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search, category, isActive } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$text = { $search: search };

    const [items, total] = await Promise.all([
      Provider.find(filter).sort('-createdAt').skip(skip).limit(l).lean(),
      Provider.countDocuments(filter),
    ]);

    sendSuccess(res, 'Providers fetched', await attachLogin(items), 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) { next(err); }
};

export const getAllProvidersSimple = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const providers = await Provider.find({ isActive: true }).select('name category').sort('name').lean();
    sendSuccess(res, 'Providers', providers);
  } catch (err) { next(err); }
};

export const getProviderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = await Provider.findById(req.params.id).lean();
    if (!provider) { sendError(res, 'Provider not found', 404); return; }
    const [withLogin] = await attachLogin([provider]);
    sendSuccess(res, 'Provider', withLogin);
  } catch (err) { next(err); }
};

export const createProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, login } = splitLogin(req.body);
    const provider = await Provider.create(data);
    await syncProviderLogin(provider, login);
    const [withLogin] = await attachLogin([provider.toObject()]);
    sendSuccess(res, 'Provider created', withLogin, 201);
  } catch (err) { next(err); }
};

export const updateProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, login } = splitLogin(req.body);
    const provider = await Provider.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!provider) { sendError(res, 'Provider not found', 404); return; }
    await syncProviderLogin(provider, login);
    const [withLogin] = await attachLogin([provider.toObject()]);
    sendSuccess(res, 'Provider updated', withLogin);
  } catch (err) { next(err); }
};

/** Provider self-service: read own business profile (via the linked login's providerRef). */
export const getMyProviderProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.providerRef) { sendError(res, 'No provider profile linked to this account', 404); return; }
    const provider = await Provider.findById(req.user.providerRef).lean();
    if (!provider) { sendError(res, 'Provider profile not found', 404); return; }
    sendSuccess(res, 'Provider profile', provider);
  } catch (err) { next(err); }
};

/** Provider self-service: fill in / update own business profile (whitelisted fields only). */
export const updateMyProviderProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.providerRef) { sendError(res, 'No provider profile linked to this account', 404); return; }
    const updates: Record<string, unknown> = {};
    for (const key of PROVIDER_EDITABLE) {
      if (key in req.body) updates[key] = req.body[key];
    }
    const provider = await Provider.findByIdAndUpdate(req.user.providerRef, updates, { new: true, runValidators: true }).lean();
    if (!provider) { sendError(res, 'Provider profile not found', 404); return; }
    sendSuccess(res, 'Profile updated', provider);
  } catch (err) { next(err); }
};

export const deleteProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = await Provider.findByIdAndDelete(req.params.id);
    if (!provider) { sendError(res, 'Provider not found', 404); return; }
    // Remove the linked login account too.
    await User.deleteOne({ providerRef: provider._id, role: 'provider' });
    sendSuccess(res, 'Provider deleted', null);
  } catch (err) { next(err); }
};
